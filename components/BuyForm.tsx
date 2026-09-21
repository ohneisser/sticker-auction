"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usd, DESIGN_FEE_CENTS } from "@/lib/format";

type Props = { slotKey: string; priceCents: number; userId: string; demo?: boolean };

export default function BuyForm({ slotKey, priceCents, userId, demo }: Props) {
  const [design, setDesign] = useState<"as_is" | "custom">("as_is");
  const [brief, setBrief] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fee = design === "custom" ? DESIGN_FEE_CENTS : 0;
  const total = priceCents + fee;

  async function buy() {
    if (!file || demo) return;
    setError(null);
    setBusy("Uploading logo…");
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "file";
    const path = `${userId}/${slotKey}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: false });
    if (upErr) { setBusy(null); return setError("Logo upload failed. Try a smaller file."); }

    setBusy("Opening checkout…");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotKey, designOption: design, designBrief: brief, logoPath: path }),
    });
    const json = await res.json();
    if (!res.ok || !json.url) {
      setBusy(null);
      if (json.error === "slot_sold") return setError("Someone just took this spot.");
      if (json.error === "prime_locked") return setError("Prime unlocks once the other 17 spots are sold.");
      if (json.error === "slot_reserved") return setError("Someone is checking out this spot right now. Try again in 15 minutes or pick another one.");
      return setError("Couldn't start checkout. Try again.");
    }
    window.location.href = json.url;
  }

  return (
    <div>
      {demo && <div className="box mb-4"><p className="font-bold">Preview.</p><p className="note">Buying switches on once Supabase and Stripe keys are set.</p></div>}
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
      {error && <div className="error mb-4">{error}</div>}
      <button className="btn w-full" onClick={buy} disabled={!!busy || !file || demo}>
        {busy || `Buy this spot for ${usd(total)}`}
      </button>
      <p className="note mt-3 text-sm">You pay on the next page via Stripe. The spot is held for you for 15 minutes while you check out.</p>
    </div>
  );
}
