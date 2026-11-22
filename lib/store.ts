import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { list, put, del } from "@vercel/blob";
import { BASE_PATH, STORAGE } from "./config";
import type { Project } from "./types";

const LOCAL_DIR = path.join(process.cwd(), ".data");
const LOCAL_JSON = path.join(LOCAL_DIR, "projects.json");
export const LOCAL_UPLOADS = path.join(LOCAL_DIR, "uploads");
const BLOB_PREFIX = "data/projects-";

// Every save writes a new, uniquely named JSON file and removes the old ones, so a
// cached copy of an older list can never be served after you change something.
export async function getProjects(): Promise<Project[]> {
  if (STORAGE === "static") return readContentFolder();
  if (STORAGE === "local") {
    try {
      return JSON.parse(await fs.readFile(LOCAL_JSON, "utf8")).projects ?? [];
    } catch {
      return readContentFolder(); // nothing saved locally yet: start from the preview projects
    }
  }
  const { blobs } = await list({ prefix: BLOB_PREFIX });
  if (!blobs.length) return readContentFolder(); // nothing saved yet: start from the preview projects
  const latest = blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0];
  const res = await fetch(latest.url);
  if (!res.ok) return [];
  return (await res.json()).projects ?? [];
}

async function readContentFolder(): Promise<Project[]> {
  try {
    const file = path.join(process.cwd(), "content", "projects.json");
    const projects: Project[] = JSON.parse(await fs.readFile(file, "utf8")).projects ?? [];
    return projects.map((p) => ({
      ...p,
      images: p.images.map((i) => ({ ...i, url: i.url.startsWith("/") ? BASE_PATH + i.url : i.url })),
    }));
  } catch {
    return [];
  }
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((p) => p.slug === slug);
}

export async function saveProjects(projects: Project[]): Promise<void> {
  if (STORAGE === "static") throw new Error("The preview site is read-only.");
  const before = await getProjects();
  const body = JSON.stringify({ projects }, null, 2);

  if (STORAGE === "local") {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(LOCAL_JSON, body);
  } else {
    const { blobs: old } = await list({ prefix: BLOB_PREFIX });
    await put(`${BLOB_PREFIX}${Date.now()}.json`, body, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: true,
    });
    if (old.length) await del(old.map((b) => b.url));
  }

  // Remove image files that no project uses any more.
  const kept = new Set(projects.flatMap((p) => p.images.map((i) => i.url)));
  const removed = before.flatMap((p) => p.images.map((i) => i.url)).filter((u) => !kept.has(u));
  await deleteImages(removed);
}

export async function deleteImages(urls: string[]): Promise<void> {
  if (!urls.length) return;
  if (STORAGE === "local") {
    for (const u of urls) {
      if (!u.startsWith("/media/")) continue;
      await fs.rm(path.join(LOCAL_UPLOADS, path.basename(u)), { force: true });
    }
  } else {
    await del(urls.filter((u) => u.includes(".blob.vercel-storage.com")));
  }
}
