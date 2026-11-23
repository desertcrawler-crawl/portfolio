import "server-only";

// Saves the portfolio content (content/projects.json + images in public/content/) as
// commits in the GitHub repo. Every save is one commit, and Vercel then republishes
// the site from it (about a minute). No storage service with usage limits is involved.

export const GITHUB_REPO = process.env.GITHUB_REPO || "desertcrawler-crawl/portfolio";
export const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
export const PROJECTS_PATH = "content/projects.json";
const GITHUB_API = process.env.GITHUB_API_URL || "https://api.github.com";

async function gh<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** The newest project list straight from GitHub (the published site may be a minute behind). */
export async function readProjectsFromGitHub<T>(): Promise<T | null> {
  try {
    const file = await gh<{ content: string }>(
      `/contents/${PROJECTS_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}`,
    );
    return JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("GitHub 404")) return null;
    throw e;
  }
}

/** Stores an image in the repo's object store without committing it yet. Returns its id. */
export async function createImageBlob(data: Buffer): Promise<string> {
  const blob = await gh<{ sha: string }>("/git/blobs", {
    method: "POST",
    body: JSON.stringify({ content: data.toString("base64"), encoding: "base64" }),
  });
  return blob.sha;
}

type Change = { path: string; sha?: string | null; content?: string };

/** One commit with all changes: new images (by blob id), deleted images, the new JSON. */
export async function commitChanges(changes: Change[], message: string): Promise<void> {
  const ref = await gh<{ object: { sha: string } }>(`/git/ref/heads/${GITHUB_BRANCH}`);
  const parent = await gh<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`);
  const tree = await gh<{ sha: string }>("/git/trees", {
    method: "POST",
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: changes.map((c) =>
        c.content !== undefined
          ? { path: c.path, mode: "100644", type: "blob", content: c.content }
          : { path: c.path, mode: "100644", type: "blob", sha: c.sha ?? null },
      ),
    }),
  });
  const commit = await gh<{ sha: string }>("/git/commits", {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
  });
  await gh(`/git/refs/heads/${GITHUB_BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
}
