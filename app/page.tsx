import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LaptopMap from "@/components/LaptopMap";
import LiveRefresh from "@/components/LiveRefresh";
import { usd, DESIGN_FEE_CENTS, type SlotPublic } from "@/lib/format";
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
  const open = slots.filter((s) => s.status === "open");
  const cheapest = open.length ? Math.min(...open.map((s) => s.price_cents)) : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {!isDemo && <LiveRefresh every={10000} />}

      <section className="pt-8 md:pt-16 md:grid md:grid-cols-12 md:gap-10 md:items-center">
        <div className="md:col-span-7">
          <p className="mb-4"><span className="eyebrow">{open.length} of {slots.length} spots left</span></p>
          <h1>My laptop gets seen by more AI founders than most ads do.</h1>
          <p className="mt-5 text-lg md:text-xl">
            I'm Andries. I make AI videos and pictures for brands like Adobe, Magnific, Artlist, Envato, Higgsfield and InVideo. I travel all year. My laptop is open on stages, at meetups and in cafés, in front of the founders who build the AI tools, the people who run the studios, and the creators everyone copies.
          </p>
          <p className="mt-3 text-lg md:text-xl">
            Now you can put your sticker on it. {slots.length} spots, fixed prices, first come first served.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 relative">
            <span className="scribble hidden md:block" style={{ width: 150, left: 340, top: -60, transform: "rotate(160deg) scaleX(-1)" }}><img src="/scribbles/arrow.png" alt="" /></span>
            <a href="#spots" className="btn">Pick a spot{cheapest ? `, from ${usd(cheapest)}` : ""}</a>
            <a href="#how" className="btn btn-ghost">How it works</a>
          </div>
          <p className="note mt-4">Pay once, sticker stays on. Sold spots disappear from the map.</p>
        </div>
        <div className="md:col-span-5 mt-10 md:mt-0 px-4">
          <div className="hero-wrap">
            <img src="/me.png" alt="Andries with his laptop" className="hero-img" />
            <span className="scribble" style={{ width: "50%", left: "4%", top: "14%", transform: "rotate(-8deg)" }}><img src="/scribbles/loveit.png" alt="" /></span>
          </div>
          <p className="socials mt-4 text-center">
            <a href="https://instagram.com/ohneis652" target="_blank" rel="noreferrer">Insta</a>
            <span className="note mx-3">·</span>
            <a href="https://linkedin.com/in/andries-ohneisser" target="_blank" rel="noreferrer">LinkedIn</a>
          </p>
          <div className="relative h-28 md:h-20 mb-6 md:mb-0">
            <span className="scribble" style={{ width: 220, left: "50%", top: -22, transform: "translateX(-50%) rotate(-4deg)" }}><img src="/scribbles/scribble.png" alt="" /></span>
          </div>
        </div>
      </section>

      <section id="spots" className="mt-20 md:mt-24 scroll-mt-20">
        <h2>Pick your spot.</h2>
        <p className="note mt-2 mb-5">Real sizes on a 16 inch MacBook. Tap a price to buy that spot. The big square on the Apple logo is Prime.</p>
        <LaptopMap slots={slots} />
        <p className="note mt-4 md:max-w-xl">First come, first served. While you check out, the spot is held for you for 15 minutes. Nobody sees who bought what until the reveal.</p>
      </section>

      <section className="mt-28 md:mt-36 box">
        <span className="scribble" style={{ width: 190, right: -40, top: -90, transform: "rotate(10deg)" }}><img src="/scribbles/stars.png" alt="" /></span>
        <h2>The Prime spot.</h2>
        <p className="mt-3">The 8 cm square in the middle, right on the Apple logo. The one spot everyone sees first, every time the lid opens. {usd(slots.find((s) => s.key === "prime")?.price_cents || 0)}, and there's exactly one.</p>
        <Link href="/slot/prime" className="btn btn-ghost mt-4">Take Prime</Link>
      </section>

      <section className="mt-16 md:mt-24 grid md:grid-cols-3 gap-3">
        <div className="box"><h3>I print it and stick it on</h3><p className="mt-2 note">Upload your logo. That's all you do. It stays on the laptop as long as I use it.</p></div>
        <div className="box"><h3>3 Instagram stories</h3><p className="mt-2 note">In the next 3 months I show the laptop in my stories and tag you. Plus one post when all the stickers are on.</p></div>
        <div className="box"><h3>Want me to design it?</h3><p className="mt-2 note">I turn your logo into one of my own sticker designs. {usd(DESIGN_FEE_CENTS)} extra. One version, no changes.</p></div>
      </section>

      <section className="mt-16 md:mt-24 box">
        <span className="scribble" style={{ width: 140, left: -50, top: -70, transform: "rotate(-12deg)" }}><img src="/scribbles/sparkle.png" alt="" /></span>
        <h2>If your sticker never gets on the laptop, you get all your money back.</h2>
      </section>

      <section id="how" className="mt-16 md:mt-24 scroll-mt-20">
        <h2>How it works.</h2>
        <ol className="mt-6 space-y-3">
          <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">1</span><div>Sign up. Name, company, email.</div></li>
          <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">2</span><div>Pick a spot, upload your logo, pay with card on the Stripe page.</div></li>
          <li className="flex gap-4"><span className="font-bold text-2xl leading-none note">3</span><div>Done. I print the sticker, put it on, and tag you in the reveal.</div></li>
        </ol>
        <p className="note mt-6">Made for AI tools, creative apps and startups that sell to creators, studios and agencies. No gambling, no crypto pumps, nothing I wouldn't show my mom.</p>
        <div className="relative mt-10 h-40 md:h-56">
          <span className="scribble" style={{ width: "min(520px, 90%)", left: 0, top: 0, transform: "rotate(-3deg)" }}><img src="/scribbles/ohneis.png" alt="ohneis652" /></span>
        </div>
      </section>

      {open.length > 0 && (
        <div className="sticky-cta">
          <a href="#spots" className="btn w-full">Pick a spot · {open.length} left</a>
        </div>
      )}
    </div>
  );
}
