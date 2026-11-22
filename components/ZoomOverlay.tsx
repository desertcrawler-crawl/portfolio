"use client";

import { useEffect, useRef, useState } from "react";
import { ZOOM_EASE, ZOOM_MS, zoomEvents, type ZoomStart } from "@/lib/zoom";

// The flying image. Lives in the layout so it stays on screen while the page changes,
// then fades away once the project page's own image is ready.
export default function ZoomOverlay() {
  const [zoom, setZoom] = useState<ZoomStart | null>(null);
  const [phase, setPhase] = useState<"from" | "to" | "out">("from");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () =>
      zoomEvents.on((e) => {
        clearTimeout(timer.current);
        if (e.type === "start") {
          setPhase("from");
          setZoom(e.data);
          requestAnimationFrame(() => requestAnimationFrame(() => setPhase("to")));
          // safety net in case the next page never reports back
          timer.current = setTimeout(() => zoomEvents.end(), 2500);
        } else {
          setPhase("out");
          timer.current = setTimeout(() => setZoom(null), 200);
        }
      }),
    [],
  );

  if (!zoom) return null;
  const { from, to, src } = zoom;
  const r = phase === "from" ? from : to;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: from.width,
        height: from.height,
        objectFit: "contain",
        transformOrigin: "0 0",
        transform: `translate(${r.left}px, ${r.top}px) scale(${r.width / from.width})`,
        transition:
          phase === "out" ? "opacity 200ms ease" : phase === "to" ? `transform ${ZOOM_MS}ms ${ZOOM_EASE}` : "none",
        opacity: phase === "out" ? 0 : 1,
        zIndex: 50,
        pointerEvents: "none",
      }}
    />
  );
}
