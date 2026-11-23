import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { BASE_PATH, STORAGE } from "./config";
import { PROJECTS_PATH, commitChanges, readProjectsFromGitHub } from "./github";
import type { Project } from "./types";

const LOCAL_DIR = path.join(process.cwd(), ".data");
const LOCAL_JSON = path.join(LOCAL_DIR, "projects.json");
export const LOCAL_UPLOADS = path.join(LOCAL_DIR, "uploads");

/** What the site shows. On Vercel this is the content that was published with the site. */
export async function getProjects(): Promise<Project[]> {
  if (STORAGE === "local") {
    try {
      return JSON.parse(await fs.readFile(LOCAL_JSON, "utf8")).projects ?? [];
    } catch {
      return readContentFolder(); // nothing saved locally yet: start from the repo's projects
    }
  }
  return readContentFolder();
}

/** What the admin edits: the newest saved version, even if the site hasn't republished yet. */
export async function getProjectsForAdmin(): Promise<Project[]> {
  if (STORAGE === "github") {
    const data = await readProjectsFromGitHub<{ projects: Project[] }>();
    return data?.projects ?? [];
  }
  return getProjects();
}

async function readContentFolder(): Promise<Project[]> {
  try {
    const file = path.join(process.cwd(), PROJECTS_PATH);
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

/**
 * Saves the project list. `newImages` maps image urls uploaded during this edit to the
 * GitHub blob id they were stored under (github mode only).
 */
export async function saveProjects(projects: Project[], newImages: Record<string, string> = {}): Promise<void> {
  if (STORAGE === "static") throw new Error("The preview site is read-only.");
  const before = await getProjectsForAdmin();
  const body = JSON.stringify({ projects }, null, 2) + "\n";

  const kept = new Set(projects.flatMap((p) => p.images.map((i) => i.url)));
  const removed = [...new Set(before.flatMap((p) => p.images.map((i) => i.url)))].filter((u) => !kept.has(u));

  if (STORAGE === "local") {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(LOCAL_JSON, body);
    for (const u of removed) {
      if (u.startsWith("/media/")) await fs.rm(path.join(LOCAL_UPLOADS, path.basename(u)), { force: true });
    }
    return;
  }

  // github: one commit with the new images, removed images and the new list
  const isRepoImage = (u: string) => /^\/content\/[A-Za-z0-9._\/-]+$/.test(u) && !u.includes("..");
  const added = Object.entries(newImages).filter(([u, sha]) => kept.has(u) && isRepoImage(u) && /^[0-9a-f]{40}$/.test(sha));
  await commitChanges(
    [
      ...added.map(([u, sha]) => ({ path: `public${u}`, sha })),
      ...removed.filter(isRepoImage).map((u) => ({ path: `public${u}`, sha: null })),
      { path: PROJECTS_PATH, content: body },
    ],
    "Update portfolio content (from admin)",
  );
}
