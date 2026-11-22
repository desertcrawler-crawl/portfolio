"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectImage } from "@/lib/types";

type Props = { name: string; info: string; images: ProjectImage[] };

export default function Carousel({ name, info, images }: Props) {
  const [index, setIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const touchX = useRef<number | null>(null);
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

        <div className="stage">
          {images.map((img, i) => (
            <div key={img.url} className={`slide${i === index ? " active" : ""}`} aria-hidden={i !== index}>
              <Image
                src={img.url}
                alt={`${name} — image ${i + 1} of ${count}`}
                fill
                sizes="(max-width: 700px) 100vw, 760px"
                priority={i === 0}
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
          {showInfo && <p className="info-text">{info}</p>}
        </>
      )}
    </>
  );
}
