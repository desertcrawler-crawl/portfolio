"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PROJECT_IMAGE_SIZES, isSvg, type ProjectImage } from "@/lib/types";
import { zoomEvents } from "@/lib/zoom";

type Props = { name: string; info: string; images: ProjectImage[] };

export default function Carousel({ name, info, images }: Props) {
  const [index, setIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const slideEls = useRef<(HTMLDivElement | null)[]>([]);
  const drag = useRef<{ x0: number; y0: number; t0: number; dx: number; axis: "x" | "y" | null; w: number } | null>(
    null,
  );
  const settling = useRef(false);
  const resetAfterRender = useRef(false);
  const infoRef = useRef<HTMLParagraphElement>(null);
  const count = images.length;

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);


  // When the Information text opens below the fold, slide the page up just enough to show it.
  useEffect(() => {
    if (!showInfo || !infoRef.current) return;
    const overflow = infoRef.current.getBoundingClientRect().bottom + 24 - window.innerHeight;
    if (overflow > 0) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollBy({ top: overflow, behavior: smooth ? "smooth" : "auto" });
    }
  }, [showInfo]);

  // ---- Finger swipe: the image follows the finger 1:1 and the next/previous image slides in
  // beside it. (Arrows, dots and taps keep the soft fade.)
  const stageRef = useRef<HTMLDivElement>(null);
  const neighbour = (dir: number) => (index + dir + count) % count;
  function place(dx: number) {
    const w = drag.current!.w;
    const dir = dx < 0 ? 1 : -1;
    slideEls.current.forEach((el, i) => {
      if (!el) return;
      let x: number | null = null;
      if (i === index) x = dx;
      else if (i === neighbour(dir)) x = dx + dir * w;
      el.style.transition = "none";
      el.style.transform = x === null ? "" : `translateX(${x}px)`;
      el.style.opacity = x === null ? "" : "1";
    });
  }
  function reset() {
    slideEls.current.forEach((el) => {
      if (!el) return;
      el.style.transition = "none";
      el.style.transform = "";
      el.style.opacity = "";
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => slideEls.current.forEach((el) => el && (el.style.transition = ""))),
    );
  }
  useLayoutEffect(() => {
    if (resetAfterRender.current) {
      resetAfterRender.current = false;
      reset();
    }
  }, [index]);
  function onTouchStart(e: React.TouchEvent) {
    if (count < 2 || settling.current || e.touches.length > 1) return;
    const t = e.touches[0];
    drag.current = { x0: t.clientX, y0: t.clientY, t0: performance.now(), dx: 0, axis: null, w: stageRef.current?.offsetWidth || 300 };
  }
  function onTouchMove(e: React.TouchEvent) {
    const d = drag.current;
    if (!d) return;
    const t = e.touches[0];
    const dx = t.clientX - d.x0;
    const dy = t.clientY - d.y0;
    if (!d.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "x") stageRef.current?.classList.add("swiping");
    }
    if (d.axis !== "x") return;
    d.dx = dx;
    place(dx);
  }
  function onTouchEnd() {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== "x") return;
    const dt = Math.max(1, performance.now() - d.t0);
    const v = Math.abs(d.dx) / dt; // px per ms
    const commit = Math.abs(d.dx) > d.w * 0.25 || (v > 0.35 && Math.abs(d.dx) > 20);
    const dir = d.dx < 0 ? 1 : -1;
    const target = commit ? -dir * d.w : 0;
    // finish at roughly the finger's speed (quick flick = quick finish)
    const remaining = Math.abs(target - d.dx);
    const ms = Math.round(Math.min(320, Math.max(140, remaining / Math.max(v, 1.2))));
    const ease = `transform ${ms}ms cubic-bezier(0.2, 0.7, 0.3, 1)`;
    const cur = slideEls.current[index];
    const nb = slideEls.current[neighbour(dir)];
    settling.current = true;
    [cur, nb].forEach((el) => el && (el.style.transition = ease));
    if (cur) cur.style.transform = `translateX(${target}px)`;
    if (nb && nb !== cur) nb.style.transform = `translateX(${target + dir * d.w}px)`;
    setTimeout(() => {
      stageRef.current?.classList.remove("swiping");
      settling.current = false;
      if (commit) {
        resetAfterRender.current = true; // clear the slide positions once the new image is "active"
        setIndex(neighbour(dir));
      } else reset();
    }, ms);
  }
  return (
    <>
      <div
        className="carousel"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {count > 1 && (
          <button className="arrow prev" aria-label="Previous image" onClick={() => go(-1)}>
            <svg viewBox="0 0 14 28" aria-hidden="true">
              <polyline points="13,1 1,14 13,27" />
            </svg>
          </button>
        )}

        {/* Tapping the left or right half of the image changes image. On desktop the arrow
            areas cover the image, so this is only reached on phones. */}
        <div
          className="stage"
          ref={stageRef}
          onClick={(e) => {
            if (count < 2) return;
            const r = e.currentTarget.getBoundingClientRect();
            go(e.clientX < r.left + r.width / 2 ? -1 : 1);
          }}
        >
          {images.map((img, i) => (
            <div
              key={img.url}
              ref={(el) => {
                slideEls.current[i] = el;
              }}
              className={`slide${i === index ? " active" : ""}`}
              aria-hidden={i !== index}
            >
              <Image
                src={img.url}
                alt={`${name} — image ${i + 1} of ${count}`}
                fill
                sizes={PROJECT_IMAGE_SIZES}
                priority={i === 0}
                onLoad={i === 0 ? () => zoomEvents.end() : undefined}
                unoptimized={isSvg(img.url)}
                loading={i === 0 ? undefined : "eager"}
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <button className="arrow next" aria-label="Next image" onClick={() => go(1)}>
            <svg viewBox="0 0 14 28" aria-hidden="true">
              <polyline points="1,1 13,14 1,27" />
            </svg>
          </button>
        )}
      </div>

      {count > 1 && (
        <div className="dots" role="tablist" aria-label="Choose image">
          {images.map((img, i) => (
            <button
              key={img.url}
              role="tab"
              aria-selected={i === index}
              aria-label={`Image ${i + 1}`}
              className={`dot${i === index ? " active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}

      <h1 className="project-name" style={{ fontSize: "inherit" }}>
        {name}
      </h1>

      {info && (
        <>
          <button className="info-toggle" aria-expanded={showInfo} onClick={() => setShowInfo((s) => !s)}>
            Information
          </button>
          {showInfo && (
            <p className="info-text" ref={infoRef}>
              {info}
            </p>
          )}
        </>
      )}
    </>
  );
}
