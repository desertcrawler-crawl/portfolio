"use client";

import { useEffect, useRef, useState } from "react";
import { ZOOM_EASE, ZOOM_MS, zoomEvents, type ZoomStart } from "@/lib/zoom";

// The flying image. Lives in the layout so it stays on screen while the page changes,
// then fades away once the project page's own image is ready.
// It is drawn at its final (large) size with the full-size file and scaled DOWN to the
// thumbnail's spot at the start, so it never has to be stretched and stays sharp.
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
  const { from, to, src, thumb } = zoom;
  const transform =
    phase === "from"
      ? `translate(${from.left}px, ${from.top}px) scale(${from.width / to.width})`
      : `translate(${to.left}px, ${to.top}px) scale(1)`;
  const img: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" };
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: to.width,
        height: to.height,
        transformOrigin: "0 0",
        transform,
        willChange: "transform",
        transition:
          phase === "out" ? "opacity 200ms ease" : phase === "to" ? `transform ${ZOOM_MS}ms ${ZOOM_EASE}` : "none",
        opacity: phase === "out" ? 0 : 1,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {/* thumbnail underneath only matters if the full-size file isn't ready yet */}
      {thumb !== src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" style={img} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={img} decoding="sync" />
    </div>
  );
}
