import { NextResponse } from "next/server";
import path from "path";
import { list } from "@vercel/blob";
import { isAdmin } from "@/lib/auth";
import { STORAGE } from "@/lib/config";
import { commitChanges, createImageBlob, PROJECTS_PATH } from "@/lib/github";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// One-time rescue: copies the newest project list and all its images out of the old
// Vercel Blob store into the GitHub repo, as one commit. Safe to run more than once.
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (STORAGE !== "github") return NextResponse.json({ error: "GITHUB_TOKEN is not set" }, { status: 400 });
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    return NextResponse.json({ error: "The Blob store is not connected to this project (BLOB_READ_WRITE_TOKEN missing)." }, { status: 400 });

  try {
    const { blobs } = await list({ prefix: "data/projects" });
    if (!blobs.length) return NextResponse.json({ error: "No project list found in the Blob store." }, { status: 404 });
    const latest = blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0];
    const res = await fetch(latest.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Blob store answered ${res.status} for the project list`);
    const projects: Project[] = (await res.json()).projects ?? [];

    const urls = [...new Set(projects.flatMap((p) => p.images.map((i) => i.url)))].filter((u) =>
      u.includes(".blob.vercel-storage.com"),
    );
    const mapped = new Map<string, { local: string; sha: string }>();
    const failed: string[] = [];
    let next = 0;
    async function worker() {
      while (next < urls.length) {
        const u = urls[next++];
        try {
          const r = await fetch(u, { cache: "no-store" });
          if (!r.ok) throw new Error(String(r.status));
          const sha = await createImageBlob(Buffer.from(await r.arrayBuffer()));
          const name = path.basename(new URL(u).pathname).replace(/[^a-zA-Z0-9._-]/g, "-");
          mapped.set(u, { local: `/content/${name}`, sha });
        } catch {
          failed.push(u);
        }
      }
    }
    await Promise.all(Array.from({ length: 4 }, worker));
    if (failed.length)
      return NextResponse.json({ error: `${failed.length} of ${urls.length} images could not be copied. Nothing was changed; please try again.` }, { status: 502 });

    const fixed = projects.map((p) => ({
      ...p,
      images: p.images.map((i) => (mapped.has(i.url) ? { ...i, url: mapped.get(i.url)!.local } : i)),
    }));
    await commitChanges(
      [
        ...[...mapped.values()].map((m) => ({ path: `public${m.local}`, sha: m.sha })),
        { path: PROJECTS_PATH, content: JSON.stringify({ projects: fixed }, null, 2) + "\n" },
      ],
      "Import portfolio content from the old Vercel Blob store",
    );
    return NextResponse.json({ projects: fixed, images: mapped.size });
  } catch (e) {
    return NextResponse.json({ error: `Import failed: ${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
}
