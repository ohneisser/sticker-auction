"use client";
import { useState } from "react";
import { usd, DESIGN_FEE_CENTS } from "@/lib/format";

type Props = { slotKey: string; priceCents: number; demo?: boolean };

export default function BuyForm({ slotKey, priceCents, demo }: Props) {
  const [f, setF] = useState({ fullName: "", company: "", website: "", email: "" });
  const [design, setDesign] = useState<"as_is" | "custom">("as_is");
  const [brief, setBrief] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fee = design === "custom" ? DESIGN_FEE_CENTS : 0;
  const total = priceCents + fee;
  const ready = !!file && terms && f.fullName.trim() && f.company.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function buy() {
    if (!ready || !file || demo) return;
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("slotKey", slotKey);
    fd.set("fullName", f.fullName); fd.set("company", f.company); fd.set("website", f.website); fd.set("email", f.email);
    fd.set("designOption", design); fd.set("designBrief", brief); fd.set("terms", "yes"); fd.set("logo", file);
    const res = await fetch("/api/checkout", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      setBusy(false);
      if (json.error === "slot_sold") return setError("Someone just took this spot.");
      if (json.error === "slot_reserved") return setError("Someone is checking out this spot right now. Try again in 15 minutes or pick another one.");
      if (json.error === "prime_locked") return setError("Prime unlocks once the other 17 spots are sold.");
      if (json.error === "bad_logo") return setError("Logo has to be SVG, PDF, AI or PNG, under 20 MB.");
      return setError("Couldn't start checkout. Check your details and try again.");
    }
    window.location.href = json.url;
  }

  return (
    <div>
      {demo && <div className="box mb-4"><p className="font-bold">Preview.</p><p className="note">Buying switches on once Supabase and Stripe keys are set.</p></div>}
      <label className="field"><span>Your name</span><input value={f.fullName} onChange={set("fullName")} autoComplete="name" /></label>
      <label className="field"><span>Company</span><input value={f.company} onChange={set("company")} autoComplete="organization" /></label>
      <label className="field"><span>Website</span><input value={f.website} onChange={set("website")} type="url" placeholder="https://" /></label>
      <label className="field"><span>Email (receipt and confirmation go here)</span><input value={f.email} onChange={set("email")} type="email" autoComplete="email" /></label>
      <label className="field">
        <span>Your logo (SVG, PDF, AI or PNG, max 20 MB)</span>
        <input type="file" accept=".svg,.pdf,.ai,.png,.eps,image/svg+xml,application/pdf,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
      <div className="grid gap-3 mb-4">
        <label className={`choice ${design === "as_is" ? "on" : ""}`}>
          <input type="radio" name="design" checked={design === "as_is"} onChange={() => setDesign("as_is")} className="mt-1" />
          <div><div className="font-bold">Print my logo as it is</div><div className="note">Included. Your file, cut to the spot, done.</div></div>
        </label>
        <label className={`choice ${design === "custom" ? "on" : ""}`}>
          <input type="radio" name="design" checked={design === "custom"} onChange={() => setDesign("custom")} className="mt-1" />
          <div><div className="font-bold">Andries designs the sticker, +{usd(DESIGN_FEE_CENTS)}</div><div className="note">Your logo built into an original piece of mine. One of one. Tell me what you like and don't like, then I make the call. No revisions.</div></div>
        </label>
      </div>
      {design === "custom" && (
        <label className="field">
          <span>Anything I should know? Likes, dislikes, colors to avoid.</span>
          <textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={600} />
        </label>
      )}
      <label className="flex gap-3 items-start mb-5 cursor-pointer">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 shrink-0" />
        <span className="text-sm">I get it: all sales are final and there are no refunds. The only exception is if my sticker never makes it onto the laptop. The sticker stays on as long as Andries uses this MacBook, and he can decline logos he doesn't want on it (full refund in that case).</span>
      </label>
      {error && <div className="error mb-4">{error}</div>}
      <button className="btn w-full" onClick={buy} disabled={busy || !ready || demo}>
        {busy ? "Opening checkout…" : `Buy this spot for ${usd(total)}`}
      </button>
      <p className="note mt-3 text-sm">You pay on the next page via Stripe. The spot is held for you for 15 minutes while you check out.</p>
    </div>
  );
}
