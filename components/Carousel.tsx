"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PROJECT_IMAGE_SIZES, isSvg, type ProjectImage } from "@/lib/types";
import { zoomEvents } from "@/lib/zoom";

type Props = { name: string; info: string; images: ProjectImage[] };

export default function Carousel({ name, info, images }: Props) {
  const [index, setIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const touchX = useRef<number | null>(null);
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
  return (
    <>
      <div
        className="carousel"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
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
          onClick={(e) => {
            if (count < 2) return;
            const r = e.currentTarget.getBoundingClientRect();
            go(e.clientX < r.left + r.width / 2 ? -1 : 1);
          }}
        >
          {images.map((img, i) => (
            <div key={img.url} className={`slide${i === index ? " active" : ""}`} aria-hidden={i !== index}>
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
