"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PROJECT_IMAGE_SIZES, isSvg, type Project } from "@/lib/types";
import { ZOOM_MS, preloadFull, projectImageRect, zoomEvents } from "@/lib/zoom";

// The same file list the project page uses for its first image.
function fullProps(p: Project) {
  const img = p.images[0];
  const { props } = getImageProps({
    src: img.url,
    alt: "",
    fill: true,
    sizes: PROJECT_IMAGE_SIZES,
    unoptimized: isSvg(img.url),
  });
  return { srcSet: props.srcSet, src: props.src as string };
}

const MAX_WAIT_MS = 300; // longest we wait for the sharp file before starting the zoom

export default function Grid({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);
  const full = useMemo(() => new Map(projects.map((p) => [p.id, fullProps(p)])), [projects]);

  const preload = (p: Project) => {
    const f = full.get(p.id)!;
    return preloadFull(p.id, f.srcSet, PROJECT_IMAGE_SIZES, f.src);
  };

  // Quietly fetch the sharp versions in the background once the page has settled.
  useEffect(() => {
    const t = setTimeout(() => projects.slice(0, 18).forEach(preload), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  async function open(e: React.MouseEvent<HTMLAnchorElement>, p: Project) {
    // let cmd/ctrl/middle-click open a new tab as usual
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const thumbEl = e.currentTarget.querySelector("img");
    if (!thumbEl || leaving) return;
    e.preventDefault();
    const from = thumbEl.getBoundingClientRect();
    const to = projectImageRect();
    const thumb = thumbEl.currentSrc || thumbEl.src;
    const src = await Promise.race([
      preload(p),
      new Promise<string>((r) => setTimeout(() => r(full.get(p.id)!.src), MAX_WAIT_MS)),
    ]);
    zoomEvents.start({ src, thumb, from, to });
    setLeaving(p.id);
    setTimeout(() => router.push(`/p/${p.slug}`), ZOOM_MS);
  }

  return (
    <main className={`grid${leaving ? " leaving" : ""}`}>
      {projects.map((p, i) => (
        <Link
          key={p.id}
          href={`/p/${p.slug}`}
          className={`tile${leaving === p.id ? " chosen" : ""}`}
          onClick={(e) => open(e, p)}
          onPointerEnter={() => preload(p)}
          onPointerDown={() => preload(p)}
        >
          <div className="tile-img">
            <Image
              src={p.images[0].url}
              alt={p.name}
              fill
              sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 17vw"
              priority={i < 6}
              unoptimized={isSvg(p.images[0].url)}
            />
          </div>
          <div className="tile-caption">{p.name}</div>
        </Link>
      ))}
    </main>
  );
}
