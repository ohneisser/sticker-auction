"use client";
import { useState } from "react";

export default function DrawPrime() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function draw() {
    if (!confirm("Draw the Prime winner now? This runs once and can't be undone.")) return;
    setBusy(true);
    const r = await fetch("/api/admin/draw-prime", { method: "POST" });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? `Prime goes to ${j.winner?.company} (${j.winner?.email})` : `Not drawn: ${j.error}`);
  }
  return (
    <div>
      <button className="btn" onClick={draw} disabled={busy}>{busy ? "Drawing…" : "Draw Prime winner"}</button>
      {msg && <div className="note mt-2">{msg}</div>}
    </div>
  );
}
