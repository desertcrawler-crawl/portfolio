"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isSvg, type Project } from "@/lib/types";
import { ZOOM_MS, projectImageRect, zoomEvents } from "@/lib/zoom";

export default function Grid({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);

  function open(e: React.MouseEvent<HTMLAnchorElement>, p: Project) {
    // let cmd/ctrl/middle-click open a new tab as usual
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const img = e.currentTarget.querySelector("img");
    if (!img) return;
    e.preventDefault();
    window.scrollTo({ top: window.scrollY }); // stop any momentum scroll
    const from = img.getBoundingClientRect();
    zoomEvents.start({ src: img.currentSrc || img.src, from, to: projectImageRect() });
    setLeaving(p.id);
    setTimeout(() => {
      router.push(`/p/${p.slug}`, { scroll: true });
    }, ZOOM_MS);
  }

  return (
    <main className={`grid${leaving ? " leaving" : ""}`}>
      {projects.map((p, i) => (
        <Link
          key={p.id}
          href={`/p/${p.slug}`}
          className={`tile${leaving === p.id ? " chosen" : ""}`}
          onClick={(e) => open(e, p)}
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
