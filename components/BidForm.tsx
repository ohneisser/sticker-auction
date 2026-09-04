"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createClient } from "@/lib/supabase/client";
import { usd, DESIGN_FEE_CENTS } from "@/lib/format";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

type Props = { slotKey: string; minBidCents: number; userId: string; demo?: boolean };

function Options({ design, setDesign, brief, setBrief, file, setFile }: {
  design: "as_is" | "custom"; setDesign: (d: "as_is" | "custom") => void;
  brief: string; setBrief: (b: string) => void;
  file: File | null; setFile: (f: File | null) => void;
}) {
  return (
    <>
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
          <div><div className="font-bold">Andries designs the sticker, +{usd(DESIGN_FEE_CENTS)}</div><div className="note">Your logo built into an original piece of mine. One of one. You can tell me what you like and don't like, then I make the call. No revisions.</div></div>
        </label>
      </div>
      {design === "custom" && (
        <label className="field">
          <span>Anything I should know? Likes, dislikes, colors to avoid.</span>
          <textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={600} />
        </label>
      )}
    </>
  );
}

function Inner({ slotKey, minBidCents, userId }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [amount, setAmount] = useState(String(Math.ceil(minBidCents / 100)));
  const [design, setDesign] = useState<"as_is" | "custom">("as_is");
  const [brief, setBrief] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const fee = design === "custom" ? DESIGN_FEE_CENTS : 0;
  const total = amountCents + fee;
  const tooLow = !Number.isFinite(amountCents) || amountCents < minBidCents;

  async function submit() {
    if (!stripe || !elements || !file) return;
    setError(null);

    // 1. upload logo to the user's own folder
    setBusy("Uploading logo…");
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "file";
    const path = `${userId}/${slotKey}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: false });
    if (upErr) { setBusy(null); return setError("Logo upload failed. Try a smaller file."); }

    // 2. verify and save the card, nothing charged
    setBusy("Checking card…");
    const { error: submitError } = await elements.submit();
    if (submitError) { setBusy(null); return setError(submitError.message || "Card check failed."); }
    const { error: setupError, setupIntent } = await stripe.confirmSetup({ elements, redirect: "if_required", confirmParams: { return_url: window.location.href } });
    if (setupError || !setupIntent || setupIntent.status !== "succeeded") { setBusy(null); return setError(setupError?.message || "We couldn't verify that card."); }

    // 3. place the bid
    setBusy("Placing bid…");
    const res = await fetch("/api/bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotKey, amountCents, paymentMethodId: setupIntent.payment_method, designOption: design, designBrief: brief, logoPath: path }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      if (json.error === "bid_too_low") return setError(`Someone just bid higher. You need at least ${usd(json.minCents)} now.`);
      if (json.error === "slot_closed") return setError("This spot just closed.");
      if (json.error === "already_leading") return setError("You're already the highest bidder here.");
      return setError("Something went wrong placing the bid. Try again.");
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="box" style={{ borderLeft: "3px solid var(--ink)" }}>
        <p className="font-bold">Bid placed. You're leading with {usd(amountCents)}.</p>
        <p className="note mt-1">You'll get an email if someone outbids you.</p>
      </div>
    );
  }

  return (
    <div>
      <label className="field">
        <span>Your bid in USD, at least {usd(minBidCents)}</span>
        <input type="number" inputMode="numeric" min={Math.ceil(minBidCents / 100)} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <Options design={design} setDesign={setDesign} brief={brief} setBrief={setBrief} file={file} setFile={setFile} />
      <div className="mb-5">
        <span className="block text-sm note mb-2">Card, verified now, charged only if you win</span>
        <div className="bg-white p-3 border border-[var(--line)]"><PaymentElement options={{ layout: "tabs" }} /></div>
      </div>
      {error && <div className="error mb-4">{error}</div>}
      <button className="btn w-full" onClick={submit} disabled={!!busy || tooLow || !stripe || !file}>
        {busy || `Bid ${usd(amountCents)}${fee ? ` + ${usd(fee)} design` : ""}`}
      </button>
      <p className="note mt-3 text-sm">If you win, {usd(total)} is charged to this card. Bids can't be taken back.</p>
    </div>
  );
}

export default function BidForm(props: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [design, setDesign] = useState<"as_is" | "custom">("as_is");
  const [brief, setBrief] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (props.demo) return;
    fetch("/api/setup-intent", { method: "POST" })
      .then((r) => r.json())
      .then((j) => (j.clientSecret ? setClientSecret(j.clientSecret) : setError("Couldn't start the payment form. Reload the page.")))
      .catch(() => setError("Couldn't start the payment form. Reload the page."));
  }, [props.demo]);

  if (props.demo) {
    const fee = design === "custom" ? DESIGN_FEE_CENTS : 0;
    return (
      <div>
        <div className="box mb-4"><p className="font-bold">Preview.</p><p className="note">Bidding switches on once Supabase and Stripe keys are set.</p></div>
        <label className="field"><span>Your bid in USD, at least {usd(props.minBidCents)}</span><input type="number" defaultValue={Math.ceil(props.minBidCents / 100)} /></label>
        <Options design={design} setDesign={setDesign} brief={brief} setBrief={setBrief} file={file} setFile={setFile} />
        <div className="mb-5"><span className="block text-sm note mb-2">Card, verified now, charged only if you win</span><div className="box note">Stripe card form appears here</div></div>
        <button className="btn w-full" disabled>Bid {usd(props.minBidCents)}{fee ? ` + ${usd(fee)} design` : ""}</button>
      </div>
    );
  }

  if (error) return <div className="error">{error}</div>;
  if (!clientSecret) return <p className="note">Loading payment form…</p>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "flat", variables: { colorPrimary: "#141414", colorBackground: "#ffffff", colorText: "#141414", borderRadius: "0px", fontFamily: "Satoshi, Inter, system-ui, sans-serif" } } }}>
      <Inner {...props} />
    </Elements>
  );
}
