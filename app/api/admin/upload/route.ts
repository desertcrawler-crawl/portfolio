import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isAdmin } from "@/lib/auth";
import { STORAGE } from "@/lib/config";
import { createImageBlob } from "@/lib/github";
import { LOCAL_UPLOADS } from "@/lib/store";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml"];
const EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
};

// Receives one image. Locally it is written to .data/uploads; on Vercel it is stored in the
// GitHub repo (not committed yet; that happens on Save, together with the project list).
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (STORAGE === "static") return NextResponse.json({ error: "Read-only site" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Please choose an image file." }, { status: 400 });
  }
  const base =
    path
      .basename(file.name, path.extname(file.name))
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
  const name = `${base}-${crypto.randomUUID().slice(0, 8)}${EXT[file.type]}`;
  const data = Buffer.from(await file.arrayBuffer());

  if (STORAGE === "github") {
    try {
      const sha = await createImageBlob(data);
      return NextResponse.json({ url: `/content/${name}`, sha });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "GitHub refused the upload. Check the GITHUB_TOKEN setting." }, { status: 502 });
    }
  }

  await fs.mkdir(LOCAL_UPLOADS, { recursive: true });
  await fs.writeFile(path.join(LOCAL_UPLOADS, name), data);
  return NextResponse.json({ url: `/media/${name}` });
}
