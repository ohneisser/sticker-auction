import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LaptopMap from "@/components/LaptopMap";
import Countdown from "@/components/Countdown";
import LiveRefresh from "@/components/LiveRefresh";
import { usd, nextMinBid, DESIGN_FEE_CENTS, TICKET_PRICE_CENTS, type SlotPublic } from "@/lib/format";
import { isDemo, demoSlots } from "@/lib/demo";

export const dynamic = "force-dynamic";

async function loadSlots(): Promise<SlotPublic[]> {
  if (isDemo) return demoSlots;
  const supabase = await createClient();
  const { data } = await supabase.from("slots_public").select("*").order("sort_order");
  return (data || []) as SlotPublic[];
}

export default async function Home() {
  const slots = await loadSlots();
  const latestEnd = slots.reduce((m, s) => (s.ends_at > m ? s.ends_at : m), slots[0]?.ends_at || new Date().toISOString());
  const sellable = slots.filter((s) => s.kind !== "prize");
  const open = sellable.filter((s) => s.status === "open");
  const totalBids = slots.reduce((n, s) => n + Number(s.bid_count || 0), 0);

  return (
    <div className="max-w-6xl mx-auto">
      {!isDemo && <LiveRefresh />}

      <section className="pt-8 md:pt-16 max-w-3xl">
        <p className="font-bold mb-4">{open.length} of {sellable.length} spots open · ends in <Countdown endsAt={latestEnd} /></p>
        <h1>My laptop gets seen by more AI people than most ads do.</h1>
        <p className="mt-5 text-lg md:text-xl">
          I'm Andries. I make AI videos and pictures for brands like Adobe, Magnific, Artlist, Envato, Higgsfield and InVideo. I travel all year. My laptop is open on stages, at meetups and in cafés, right next to the best people in AI.
        </p>
        <p className="mt-3 text-lg md:text-xl">
          Now you can put your sticker on it. 16 spots, 7 days, highest bid wins.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a href="#spots" className="btn">Pick a spot</a>
          <a href="#how" className="btn btn-ghost">How it works</a>
        </div>
        <p className="note mt-4">{totalBids} bids so far. You only pay if you win.</p>
      </section>

      <section id="spots" className="mt-14 md:mt-24 scroll-mt-20">
        <h2>Pick your spot.</h2>
        <p className="note mt-2 mb-5">Real sizes on a 16 inch MacBook. Dark means someone already bid. Tap one to bid.</p>
        <LaptopMap slots={slots} />
        <ul className="mt-6 rule">
          {sellable.map((s) => {
            const min = nextMinBid(s.min_bid_cents, s.current_bid_cents);
            return (
              <li key={s.key} className="py-3 flex items-center justify-between gap-3 border-b border-[var(--line)]">
                <div className="min-w-0">
                  <span className="font-bold">{s.label}</span>
                  <span className="note ml-2">{s.width_cm} × {s.height_cm} cm</span>
                  <div className="note">{s.status !== "open" ? "sold" : s.current_bid_cents ? `${usd(s.current_bid_cents)} · ${s.bid_count} bids` : "no bids yet"}</div>
                </div>
                {s.status === "open" ? (
                  <Link href={`/slot/${s.key}`} className="btn shrink-0 !py-2 !px-3 !min-h-0 text-sm">{usd(min)}+</Link>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="note mt-3">Each new bid is at least $25 or 10% more. A bid in the last 10 minutes adds 10 more minutes. Nobody sees who is bidding.</p>
      </section>

      <section className="mt-14 md:mt-20 box">
        <h2>The Prime spot.</h2>
        <p className="mt-3">The big square in the middle, right on the Apple logo. You can't buy it. It opens when all 16 spots are sold. Then you buy tickets, {usd(TICKET_PRICE_CENTS)} each, as many as you want. One ticket gets pulled. If you won a spot, all your tickets count twice.</p>
        <Link href="/prime" className="btn btn-ghost mt-4">More about Prime</Link>
      </section>

      <section className="mt-16 md:mt-24 grid md:grid-cols-3 gap-3">
        <div className="box"><h3>I print it and stick it on</h3><p className="mt-2 note">Upload your logo. That's all you do. It stays on the laptop as long as I use it.</p></div>
        <div className="box"><h3>3 Instagram stories</h3><p className="mt-2 note">In the next 3 months I show the laptop in my stories and tag you. Plus one post when all the stickers are on.</p></div>
        <div className="box"><h3>Want me to design it?</h3><p className="mt-2 note">I turn your logo into one of my own sticker designs. {usd(DESIGN_FEE_CENTS)} extra. One version, no changes.</p></div>
      </section>

      <section className="mt-16 md:mt-24 box">
        <h2>If your sticker never gets on the laptop, you get all your money back.</h2>
      </section>

      <section id="how" className="mt-16 md:mt-24 scroll-mt-20">
        <h2>How it works.</h2>
        <ol className="mt-6 space-y-3">
          <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">1</span><div>Sign up. Name, company, email.</div></li>
          <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">2</span><div>Pick a spot, upload your logo, type your bid. Add a card. Nothing is charged yet.</div></li>
          <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">3</span><div>Someone bids more? You get an email and can bid again.</div></li>
          <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">4</span><div>Time runs out. Highest bid wins and pays. I print the sticker and put it on.</div></li>
        </ol>
        <p className="note mt-6">Made for AI tools, creative apps and startups that sell to creators, studios and agencies. No gambling, no crypto pumps, nothing I wouldn't show my mom.</p>
      </section>

      {open.length > 0 && (
        <div className="sticky-cta">
          <a href="#spots" className="btn w-full">Pick a spot · <Countdown endsAt={latestEnd} /></a>
        </div>
      )}
    </div>
  );
}
