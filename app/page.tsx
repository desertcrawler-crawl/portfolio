import Image from "next/image";
import Link from "next/link";
import { getProjects } from "@/lib/store";
import { CONTACT_EMAIL } from "@/lib/config";
import { isSvg } from "@/lib/types";

export const revalidate = 3600;

export default async function Home() {
  const projects = (await getProjects()).filter((p) => p.images.length > 0);

  if (!projects.length) {
    return <p className="empty">No projects yet.</p>;
  }

  return (
    <>
    <main className="grid">
      {projects.map((p, i) => (
        <Link key={p.id} href={`/p/${p.slug}`} className="tile">
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
    <footer className="site-footer">
      <a href={`mailto:${CONTACT_EMAIL}`}>
        <span>Niclas Sellebråten</span>
        <span>Art Director &amp; Type Consultant</span>
        <span>Open for work</span>
      </a>
    </footer>
    </>
  );
}
