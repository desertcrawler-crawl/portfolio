import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
      <Carousel name={project.name} info={project.info} images={project.images} />
    </main>
  );
}
