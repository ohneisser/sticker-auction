import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BidForm from "@/components/BidForm";
import Countdown from "@/components/Countdown";
import LiveRefresh from "@/components/LiveRefresh";
import { usd, nextMinBid, type SlotPublic } from "@/lib/format";
import { isDemo, demoSlots } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function SlotPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  let s: SlotPublic | undefined;
  let userId: string | null = null;
  let mine: { amount_cents: number; status: string } | undefined;

  if (isDemo) {
    s = demoSlots.find((d) => d.key === key);
  } else {
    const supabase = await createClient();
    const [{ data: slot }, { data: auth }] = await Promise.all([
      supabase.from("slots_public").select("*").eq("key", key).single(),
      supabase.auth.getUser(),
    ]);
    s = (slot as SlotPublic) || undefined;
    userId = auth.user?.id ?? null;
    const { data: myBids } = await supabase.from("bids").select("amount_cents, status").eq("slot_key", key).order("created_at", { ascending: false }).limit(1);
    mine = myBids?.[0];
  }
  if (!s) notFound();
  const minBid = nextMinBid(s.min_bid_cents, s.current_bid_cents);
  const iAmLeading = mine?.status === "leading";

  return (
    <div className="max-w-2xl mx-auto pt-6 md:pt-10">
      {!isDemo && <LiveRefresh every={15000} />}
      <Link href="/#spots" className="note">← all spots</Link>
      <h2 className="mt-3">{s.label}</h2>
      <p className="note">{s.width_cm} × {s.height_cm} cm, {s.format}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="box">
          <div className="note">Current bid</div>
          <div className="text-2xl font-bold">{s.current_bid_cents ? usd(s.current_bid_cents) : "none yet"}</div>
          <div className="note">{s.bid_count} bids</div>
        </div>
        <div className="box">
          <div className="note">Ends in</div>
          <div className="text-2xl font-bold"><Countdown endsAt={s.ends_at} /></div>
          <div className="note">+10 min on late bids</div>
        </div>
      </div>

      {s.kind === "prize" ? (
        <p className="mt-8">Prime is raffled, not sold. <Link href="/prime">How it works</Link>.</p>
      ) : s.status !== "open" ? (
        <p className="mt-8">This spot is closed.</p>
      ) : iAmLeading ? (
        <div className="mt-8 box" style={{ borderLeft: "3px solid var(--ink)" }}>
          <p className="font-bold">You're leading with {usd(mine!.amount_cents)}.</p>
          <p className="note mt-1">If someone tops it, you get an email and can bid again here.</p>
        </div>
      ) : (
        <div className="mt-8">
          {mine?.status === "outbid" && <p className="mb-4 font-bold">You were outbid. Your last bid was {usd(mine.amount_cents)}.</p>}
          <BidForm slotKey={s.key} minBidCents={minBid} userId={userId || "demo"} demo={isDemo} />
        </div>
      )}
    </div>
  );
}
