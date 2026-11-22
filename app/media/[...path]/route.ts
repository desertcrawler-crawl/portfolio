// Serves uploaded images when the site runs without Vercel Blob (on your own computer).
import { promises as fs } from "fs";
import path from "path";
import { LOCAL_UPLOADS } from "@/lib/store";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const name = path.basename((await params).path.join("/"));
  try {
    const data = await fs.readFile(path.join(LOCAL_UPLOADS, name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
