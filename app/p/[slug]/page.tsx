import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject, getProjects } from "@/lib/store";
import { SITE_TITLE } from "@/lib/config";
import Carousel from "@/components/Carousel";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProject((await params).slug);
  if (!p) return {};
  return {
    title: `${p.name} — ${SITE_TITLE}`,
    description: p.info,
    openGraph: { images: p.images[0] ? [p.images[0].url] : [] },
  };
}

export default async function ProjectPage({ params }: Props) {
  const project = await getProject((await params).slug);
  if (!project || !project.images.length) notFound();

  return (
    <main className="project">
      <Link href="/" className="home-arrow" aria-label="Back to all projects">
        <svg viewBox="0 0 24 16" aria-hidden="true">
          <line x1="23" y1="8" x2="1.5" y2="8" />
          <polyline points="8,1 1,8 8,15" />
        </svg>
      </Link>
      <Carousel name={project.name} info={project.info} images={project.images} />
    </main>
  );
}
