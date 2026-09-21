import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BuyForm from "@/components/BuyForm";
import LiveRefresh from "@/components/LiveRefresh";
import { usd, untilNextRise, type SlotPublic } from "@/lib/format";
import { isDemo, demoSlots } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function SlotPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { key } = await params;
  const { paid } = await searchParams;
  let s: SlotPublic | undefined;
  let userId: string | null = null;
  let mine: { status: string; amount_cents: number } | undefined;

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
    const { data: orders } = await supabase.from("orders").select("status, amount_cents").eq("slot_key", key).eq("status", "paid").limit(1);
    mine = orders?.[0];
  }
  if (!s) notFound();

  return (
    <div className="max-w-2xl mx-auto pt-6 md:pt-10">
      {!isDemo && <LiveRefresh every={15000} />}
      <Link href="/#spots" className="note">← all spots</Link>
      <h2 className="mt-3">{s.label}</h2>
      <p className="note">{s.width_cm} × {s.height_cm} cm, {s.format}{s.key === "prime" ? " · right on the Apple logo" : ""}</p>

      <div className="mt-5 box">
        <div className="note">Price</div>
        <div className="text-3xl font-bold price">{usd(s.price_cents)}</div>
        <div className="note">one sticker, stays on as long as this MacBook is with me, plus 3 Instagram stories</div>
        {s.key !== "prime" && s.status === "open" && (
          <div className="note mt-2">Prices go up 15% after the next {untilNextRise(s.sold_count)} spot{untilNextRise(s.sold_count) === 1 ? "" : "s"} sold. {s.sold_count} of 17 gone so far.</div>
        )}
      </div>

      {mine ? (
        <div className="mt-8 box" style={{ borderLeft: "3px solid var(--accent)" }}>
          <p className="font-bold">This spot is yours.</p>
          <p className="note mt-1">Paid {usd(mine.amount_cents)}. I have your logo, I print it and put it on. You get tagged in the reveal.</p>
        </div>
      ) : paid ? (
        <div className="mt-8 box" style={{ borderLeft: "3px solid var(--accent)" }}>
          <p className="font-bold">Payment received.</p>
          <p className="note mt-1">Give it a few seconds, the spot shows as sold once Stripe confirms.</p>
        </div>
      ) : s.status !== "open" ? (
        <p className="mt-8 font-bold">Sold. <Link href="/#spots">Pick another spot</Link>.</p>
      ) : s.locked ? (
        <div className="mt-8 box">
          <p className="font-bold">Locked. Prime opens once the other 17 spots are sold.</p>
          <p className="note mt-1">{s.sold_count} of 17 gone. When the last one goes, this one goes live at {usd(s.price_cents)}, first come first served. <Link href="/#spots">Grab one of the 17 now</Link> if you want to be around when it opens.</p>
        </div>
      ) : s.reserved ? (
        <div className="mt-8 box"><p className="font-bold">Someone is checking out this spot right now.</p><p className="note mt-1">If they don't finish within 15 minutes, it opens up again.</p></div>
      ) : (
        <div className="mt-8"><BuyForm slotKey={s.key} priceCents={s.price_cents} userId={userId || "demo"} demo={isDemo} /></div>
      )}
    </div>
  );
}
