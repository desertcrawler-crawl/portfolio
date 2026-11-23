"use client";

import { useState } from "react";
import { SortableItem, SortableList } from "./Sortable";
import { MAX_IMAGES, MIN_IMAGES, type Project, type ProjectImage } from "@/lib/types";

type Draft = { id?: string; name: string; info: string; images: ProjectImage[] };
type Props = { initial: Project[]; rawBase: string | null };
type Pending = Record<string, { sha?: string; preview: string }>;

const MAX_UPLOAD_BYTES = 4.3 * 1024 * 1024; // Vercel accepts up to ~4.5 MB per request

function readSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 1024, height: img.naturalHeight || 1024 });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 1024, height: 1024 });
    img.src = URL.createObjectURL(file);
  });
}

export default function AdminApp({ initial, rawBase }: Props) {
  const [projects, setProjects] = useState<Project[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState<Pending>({}); // uploaded this session
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);

  // Where the admin can show an image right now (new uploads from this computer,
  // saved ones straight from GitHub so they appear before the site has republished).
  const show = (url?: string) =>
    !url ? "" : pending[url]?.preview ?? (rawBase && url.startsWith("/content/") ? rawBase + url : url);

  async function save(next: Project[] | Draft[]) {
    setBusy("Saving…");
    setError("");
    setNotice("");
    const newImages = Object.fromEntries(
      Object.entries(pending)
        .filter(([, v]) => v.sha)
        .map(([u, v]) => [u, v.sha]),
    );
    const res = await fetch("/api/admin/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects: next, newImages }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Something went wrong while saving.");
      return false;
    }
    setProjects(data.projects);
    if (data.publishing) setNotice("Saved. The live site updates in about a minute.");
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
        if (file.size > MAX_UPLOAD_BYTES) throw new Error("It is larger than 4 MB. Please export it smaller.");
        const size = await readSize(file);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        const url: string = data.url;
        const preview = URL.createObjectURL(file);
        setPending((p) => ({ ...p, [url]: { sha: data.sha, preview } }));
        added.push({ url, ...size });
      } catch (e) {
        setError(`Could not upload ${file.name}. ${e instanceof Error ? e.message : ""}`);
      }
    }
    setBusy("");
    setDraft((d) => (d ? { ...d, images: [...d.images, ...added] } : d));
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.name.trim()) return setError("Please give the project a name.");
    if (draft.images.length < MIN_IMAGES) return setError(`Please add at least ${MIN_IMAGES} images.`);
    const next = draft.id
      ? projects.map((p) => (p.id === draft.id ? { ...p, ...draft } : p))
      : [{ ...draft, id: "", slug: "" } as Project, ...projects];
    if (await save(next)) setDraft(null);
  }

  function cancel() {
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
            Images ({draft.images.length} of {MIN_IMAGES}–{MAX_IMAGES}). Drag to change the order. The first one is shown on
            the front page.
          </span>
          <SortableList
            items={draft.images}
            getId={(img) => img.url}
            onReorder={(images) => setDraft({ ...draft, images })}
            layout="grid"
            className="thumbs"
            after={
              <>
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
              </>
            }
          >
            {(img, i) => (
              <SortableItem key={img.url} id={img.url} as="figure" className="thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={show(img.url)} alt="" draggable={false} />
                {i === 0 && <span className="badge">Front page</span>}
                {img.width !== img.height && <span className="warn">Not square</span>}
                <button
                  className="remove"
                  title="Remove image"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setDraft({ ...draft, images: draft.images.filter((_, k) => k !== i) })}
                >
                  ✕
                </button>
              </SortableItem>
            )}
          </SortableList>

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
      {notice && <p className="notice">{notice}</p>}
      <p>
        <button
          className="btn"
          disabled={importing}
          onClick={async () => {
            if (!confirm("Replace the projects below with the ones saved in the old Blob store?")) return;
            setImporting(true);
            setError("");
            setNotice("Copying projects and images from the Blob store. This can take a few minutes…");
            try {
              const res = await fetch("/api/admin/import-blob", { method: "POST" });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setNotice("");
                setError(data.error || `Import failed (${res.status}).`);
              } else {
                setProjects(data.projects);
                setNotice(`Imported ${data.projects.length} projects and ${data.images} images. The live site updates in about a minute.`);
              }
            } finally {
              setImporting(false);
            }
          }}
        >
          {importing ? "Importing…" : "Import from old Blob store"}
        </button>
      </p>
      <p className="hint">Drag ⠿ to change the order. The order here is the order on the front page.</p>
      <SortableList
        items={projects}
        getId={(p) => p.id}
        onReorder={(next) => {
          setProjects(next);
          save(next);
        }}
        layout="list"
        className="list"
      >
        {(p) => (
          <SortableItem key={p.id} id={p.id} handle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={show(p.images[0]?.url)} alt="" draggable={false} />
            <div className="meta">
              <b>{p.name}</b>
              <span>
                {p.images.length} images · <a href={`/p/${p.slug}`} target="_blank">/p/{p.slug}</a>
              </span>
            </div>
            <div className="actions">
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
          </SortableItem>
        )}
      </SortableList>
    </main>
  );
}
