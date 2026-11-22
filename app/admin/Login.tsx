"use client";

import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) window.location.reload();
    else setError("Wrong password");
  }

  return (
    <main className="admin narrow">
      <form onSubmit={submit} className="stack">
        <label className="label" htmlFor="pw">
          Password
        </label>
        <input id="pw" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn primary" disabled={busy || !password}>
          {busy ? "…" : "Log in"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
