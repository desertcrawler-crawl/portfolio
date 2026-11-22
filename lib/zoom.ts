"use client";

// Tiny shared state for the "zoom into project" transition: the front page starts it,
// the project page ends it once its first image has loaded.
export type ZoomStart = { src: string; from: DOMRect; to: DOMRect };
type Listener = (e: { type: "start"; data: ZoomStart } | { type: "end" }) => void;

const listeners = new Set<Listener>();
export const zoomEvents = {
  on(l: Listener) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  start(data: ZoomStart) {
    listeners.forEach((l) => l({ type: "start", data }));
  },
  end() {
    listeners.forEach((l) => l({ type: "end" }));
  },
};

export const ZOOM_MS = 420;
export const ZOOM_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

// Where the project page will show its image: measured with a hidden element that
// uses the exact same CSS (.stage), placed 64px from the top and centred.
export function projectImageRect(): DOMRect {
  const probe = document.createElement("div");
  probe.className = "stage";
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;top:0;left:0";
  document.body.appendChild(probe);
  const w = probe.getBoundingClientRect().width;
  probe.remove();
  const vw = document.documentElement.clientWidth;
  return new DOMRect((vw - w) / 2, 64, w, w);
}
