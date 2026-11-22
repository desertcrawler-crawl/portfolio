"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { MAX_IMAGES, MIN_IMAGES, type Project, type ProjectImage } from "@/lib/types";

type Draft = { id?: string; name: string; info: string; images: ProjectImage[] };
type Props = { initial: Project[]; storage: "blob" | "local" };

function readSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 1024, height: 1024 });
    img.src = URL.createObjectURL(file);
  });
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}

export default function AdminApp({ initial, storage }: Props) {
  const [projects, setProjects] = useState<Project[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fresh, setFresh] = useState<string[]>([]); // uploaded during this edit, not saved yet
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function save(next: Project[] | Draft[]) {
    setBusy("Saving…");
    setError("");
    const res = await fetch("/api/admin/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Something went wrong while saving.");
      return false;
    }
    setProjects(data.projects);
    return true;
  }

  async function addFiles(files: FileList | null) {
    if (!files || !draft) return;
    const room = MAX_IMAGES - draft.images.length;
    const chosen = Array.from(files).slice(0, room);
    if (files.length > room) setError(`A project can have at most ${MAX_IMAGES} images.`);
    const added: ProjectImage[] = [];
    for (const [n, file] of chosen.entries()) {
      setBusy(`Uploading ${n + 1} of ${chosen.length}…`);
      try {
        const size = await readSize(file);
        let url: string;
        if (storage === "blob") {
          const blob = await upload(`images/${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/admin/upload",
          });
          url = blob.url;
        } else {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error((await res.json()).error);
          url = (await res.json()).url;
        }
        added.push({ url, ...size });
      } catch (e) {
        setError(`Could not upload ${file.name}. ${e instanceof Error ? e.message : ""}`);
      }
    }
    setBusy("");
    setFresh((f) => [...f, ...added.map((a) => a.url)]);
    setDraft((d) => (d ? { ...d, images: [...d.images, ...added] } : d));
  }

  async function discardFresh(keep: Set<string> = new Set()) {
    const urls = fresh.filter((u) => !keep.has(u));
    setFresh([]);
    if (urls.length) {
      await fetch("/api/admin/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
    }
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.name.trim()) return setError("Please give the project a name.");
    if (draft.images.length < MIN_IMAGES) return setError(`Please add at least ${MIN_IMAGES} images.`);
    const next = draft.id
      ? projects.map((p) => (p.id === draft.id ? { ...p, ...draft } : p))
      : [{ ...draft, id: "", slug: "" } as Project, ...projects];
    if (await save(next)) {
      await discardFresh(new Set(draft.images.map((i) => i.url)));
      setDraft(null);
    }
  }

  async function cancel() {
    await discardFresh();
    setDraft(null);
    setError("");
  }

  async function remove(p: Project) {
    if (!window.confirm(`Delete "${p.name}" and its images? This cannot be undone.`)) return;
    await save(projects.filter((x) => x.id !== p.id));
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  // ---------- edit / new project ----------
  if (draft) {
    return (
      <main className="admin">
        <div className="bar">
          <button className="link" onClick={cancel} disabled={!!busy}>
            ← Back
          </button>
          <span className="status">{busy}</span>
        </div>
        <h2>{draft.id ? "Edit project" : "New project"}</h2>

        <div className="stack">
          <label className="label" htmlFor="name">
            Project name (shown under the image)
          </label>
          <input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />

          <label className="label" htmlFor="info">
            Information (a short sentence about the project)
          </label>
          <textarea
            id="info"
            rows={3}
            value={draft.info}
            onChange={(e) => setDraft({ ...draft, info: e.target.value })}
          />

          <span className="label">
            Images ({draft.images.length} of {MIN_IMAGES}–{MAX_IMAGES}). The first one is shown on the front page.
          </span>
          <div className="thumbs">
            {draft.images.map((img, i) => (
              <figure key={img.url} className="thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" />
                {img.width !== img.height && <span className="warn">Not square</span>}
                <figcaption>
                  <button title="Move left" onClick={() => setDraft({ ...draft, images: move(draft.images, i, i - 1) })}>
                    ←
                  </button>
                  <button
                    title="Remove"
                    onClick={() => setDraft({ ...draft, images: draft.images.filter((_, k) => k !== i) })}
                  >
                    ✕
                  </button>
                  <button title="Move right" onClick={() => setDraft({ ...draft, images: move(draft.images, i, i + 1) })}>
                    →
                  </button>
                </figcaption>
              </figure>
            ))}
            {draft.images.length < MAX_IMAGES && (
              <label className="thumb add">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  disabled={!!busy}
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                + Add images
              </label>
            )}
          </div>

          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn primary" onClick={saveDraft} disabled={!!busy}>
              Save
            </button>
            <button className="btn" onClick={cancel} disabled={!!busy}>
              Cancel
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- project list ----------
  return (
    <main className="admin">
      <div className="bar">
        <a className="link" href="/" target="_blank">
          View site ↗
        </a>
        <span className="status">{busy}</span>
        <button className="link" onClick={logout}>
          Log out
        </button>
      </div>
      <div className="row">
        <h2 style={{ flex: 1 }}>Projects ({projects.length})</h2>
        <button
          className="btn primary"
          onClick={() => {
            setError("");
            setDraft({ name: "", info: "", images: [] });
          }}
        >
          + New project
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <p className="hint">The order here is the order on the front page.</p>
      <ul className="list">
        {projects.map((p, i) => (
          <li key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.images[0]?.url} alt="" />
            <div className="meta">
              <b>{p.name}</b>
              <span>
                {p.images.length} images · <a href={`/p/${p.slug}`} target="_blank">/p/{p.slug}</a>
              </span>
            </div>
            <div className="actions">
              <button title="Move up" disabled={!!busy || i === 0} onClick={() => save(move(projects, i, i - 1))}>
                ↑
              </button>
              <button
                title="Move down"
                disabled={!!busy || i === projects.length - 1}
                onClick={() => save(move(projects, i, i + 1))}
              >
                ↓
              </button>
              <button
                onClick={() => {
                  setError("");
                  setDraft({ id: p.id, name: p.name, info: p.info, images: p.images });
                }}
              >
                Edit
              </button>
              <button onClick={() => remove(p)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
