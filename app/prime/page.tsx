import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isDemo, demoSlots } from "@/lib/demo";
import { usd, TICKET_PRICE_CENTS } from "@/lib/format";
import TicketBuy from "@/components/TicketBuy";

export const dynamic = "force-dynamic";

export default async function PrimePage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const { paid } = await searchParams;
  let unlocked = false;
  let myTickets = 0;
  let wonSpot = false;
  let loggedIn = false;
  let totalTickets = 0;

  if (!isDemo) {
    const supabase = await createClient();
    const [{ data: slots }, { data: auth }] = await Promise.all([
      supabase.from("slots_public").select("kind,status"),
      supabase.auth.getUser(),
    ]);
    const sellable = (slots || []).filter((s) => s.kind !== "prize");
    unlocked = sellable.length > 0 && sellable.every((s) => s.status === "paid");
    loggedIn = !!auth.user;
    if (auth.user) {
      const [{ data: t }, { data: b }] = await Promise.all([
        supabase.from("prime_tickets").select("quantity"),
        supabase.from("bids").select("status").in("status", ["paid", "won"]),
      ]);
      myTickets = (t || []).reduce((n, x) => n + x.quantity, 0);
      wonSpot = (b || []).length > 0;
    }
  } else {
    unlocked = false;
    totalTickets = 0;
  }

  return (
    <div className="max-w-2xl mx-auto pt-6 md:pt-10">
      <Link href="/#spots" className="note">← all spots</Link>
      <h2 className="mt-3">Prime. Raffled, not sold.</h2>
      <p className="mt-4 text-lg">The 8 × 8 cm square in the middle, right on the Apple logo. The best spot on the laptop. There is no bid button for it.</p>

      <ol className="mt-6 space-y-3">
        <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">1</span><div>Prime stays locked until all 17 spots are sold.</div></li>
        <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">2</span><div>Then tickets open. {usd(TICKET_PRICE_CENTS)} each. Buy as many as you want, more tickets means more chances.</div></li>
        <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">3</span><div>Won a spot? Every ticket you buy counts twice.</div></li>
        <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">4</span><div>One ticket gets pulled. That company goes in the middle.</div></li>
      </ol>

      {paid && <div className="mt-8 box" style={{ borderLeft: "3px solid var(--ink)" }}><p className="font-bold">Tickets bought. Good luck.</p></div>}

      <div className="mt-8">
        {!unlocked ? (
          <div className="box">
            <p className="font-bold">Locked.</p>
            <p className="note mt-1">Opens the moment the last of the 17 spots is paid. Win a spot now and your tickets count twice later.</p>
            <Link href="/#spots" className="btn mt-4">Pick a spot</Link>
          </div>
        ) : !loggedIn ? (
          <Link href="/login?next=/prime" className="btn">Log in to buy tickets</Link>
        ) : (
          <TicketBuy myTickets={myTickets} wonSpot={wonSpot} />
        )}
      </div>

      <p className="note mt-8 text-sm">No purchase necessary: one free ticket per company by emailing <a href="mailto:ohneis@ohneis652.com?subject=Prime">ohneis@ohneis652.com</a> with the subject "Prime" before the draw. One free ticket, that's it. Void where prohibited.</p>
      {isDemo && totalTickets === 0 && null}
    </div>
  );
}
