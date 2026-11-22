import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/auth";
import { STORAGE } from "@/lib/config";
import { deleteImages, getProjects, LOCAL_UPLOADS } from "@/lib/store";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml"];

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  if (STORAGE === "blob") {
    // The browser uploads straight to Vercel Blob; this only hands out a one-time permission.
    const body = (await req.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: IMAGE_TYPES,
        maximumSizeInBytes: 25 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Please choose an image file." }, { status: 400 });
  }
  const ext = path.extname(file.name).toLowerCase() || ".png";
  const base = path.basename(file.name, path.extname(file.name)).replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60);
  const name = `${base}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  await fs.mkdir(LOCAL_UPLOADS, { recursive: true });
  await fs.writeFile(path.join(LOCAL_UPLOADS, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/media/${name}` });
}

// Removes images that were uploaded but never saved into a project (e.g. after "Cancel").
export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { urls } = await req.json().catch(() => ({ urls: [] }));
  const inUse = new Set((await getProjects()).flatMap((p) => p.images.map((i) => i.url)));
  await deleteImages((Array.isArray(urls) ? urls : []).filter((u: string) => typeof u === "string" && !inUse.has(u)));
  return NextResponse.json({ ok: true });
}
