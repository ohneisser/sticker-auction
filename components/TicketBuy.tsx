"use client";
import { useState } from "react";
import { usd, TICKET_PRICE_CENTS } from "@/lib/format";

export default function TicketBuy({ myTickets, wonSpot }: { myTickets: number; wonSpot: boolean }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/prime/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: qty }) });
    const j = await r.json();
    if (!r.ok || !j.url) { setBusy(false); return setError("Couldn't start checkout. Try again."); }
    window.location.href = j.url;
  }

  return (
    <div className="box">
      <p className="font-bold">You hold {myTickets} ticket{myTickets === 1 ? "" : "s"}{wonSpot ? ", counting double" : ""}.</p>
      <label className="field mt-4"><span>How many tickets</span><input type="number" min={1} max={100} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(100, parseInt(e.target.value || "1", 10))))} /></label>
      {error && <div className="error mb-3">{error}</div>}
      <button className="btn w-full" onClick={buy} disabled={busy}>{busy ? "Opening checkout…" : `Buy ${qty} ticket${qty === 1 ? "" : "s"} for ${usd(qty * TICKET_PRICE_CENTS)}`}</button>
      <p className="note mt-3 text-sm">Charged right away via Stripe. Tickets aren't refundable.</p>
    </div>
  );
}
