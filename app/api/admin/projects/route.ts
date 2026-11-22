import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getProjects, saveProjects } from "@/lib/store";
import { slugify } from "@/lib/slug";
import { MAX_IMAGES, MIN_IMAGES, type Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json({ projects: await getProjects() });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.projects)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const used = new Set<string>();
  const projects: Project[] = [];
  for (const raw of body.projects) {
    const name = String(raw?.name ?? "").trim().slice(0, 120);
    const info = String(raw?.info ?? "").trim().slice(0, 1000);
    const images = (Array.isArray(raw?.images) ? raw.images : [])
      .filter((i: unknown) => i && typeof (i as { url?: unknown }).url === "string")
      .map((i: { url: string; width?: number; height?: number }) => ({
        url: i.url,
        width: Number(i.width) || 1024,
        height: Number(i.height) || 1024,
      }));
    if (!name) return NextResponse.json({ error: "Every project needs a name." }, { status: 400 });
    if (images.length < MIN_IMAGES || images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `"${name}" needs between ${MIN_IMAGES} and ${MAX_IMAGES} images.` },
        { status: 400 },
      );
    }
    let slug = slugify(name);
    for (let n = 2; used.has(slug); n++) slug = `${slugify(name)}-${n}`;
    used.add(slug);
    projects.push({ id: String(raw.id || crypto.randomUUID()), slug, name, info, images });
  }

  await saveProjects(projects);
  revalidatePath("/", "layout");
  return NextResponse.json({ projects });
}
