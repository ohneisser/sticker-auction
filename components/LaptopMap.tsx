import Link from "next/link";
import type { SlotPublic } from "@/lib/format";
import { usd } from "@/lib/format";

// MacBook Pro 16 lid in millimetres: 356 x 248. The Apple logo in the middle stays free.
export default function LaptopMap({ slots }: { slots: SlotPublic[] }) {
  return (
    <svg viewBox="-4 -4 364 256" className="w-full h-auto" role="img" aria-label="Map of sticker spots on the laptop lid">
      <rect x="0" y="0" width="356" height="248" rx="9" fill="var(--lid)" />
      <circle cx="178" cy="124" r="24" fill="var(--lid-logo)" />
      <text x="178" y="126" textAnchor="middle" fontSize="6" fill="var(--bg)">logo</text>
      {slots.map((s) => {
        const w = s.width_cm * 10;
        const h = s.height_cm * 10;
        const prize = s.kind === "prize";
        const open = s.status === "open";
        const cls = `slot-rect ${prize ? "prize" : ""} ${s.current_bid_cents && open ? "has-bid" : ""} ${!open && !prize ? "closed" : ""}`;
        const light = prize || !open || !!s.current_bid_cents;
        const small = w < 50 || h < 40;
        const text = prize ? "Prime" : !open ? "Sold" : s.current_bid_cents ? usd(s.current_bid_cents) : usd(s.min_bid_cents);
        const inner = (
          <>
            <rect x={s.x_mm} y={s.y_mm} width={w} height={h} className={cls} />
            <text x={s.x_mm + w / 2} y={s.y_mm + h / 2 + (small ? 1.6 : 2.2) - (prize ? 3 : 0)} textAnchor="middle" className={`slot-label ${light ? "light" : ""} ${small ? "xs" : ""}`}>
              {text}
            </text>
            {prize && <text x={s.x_mm + w / 2} y={s.y_mm + h / 2 + 6} textAnchor="middle" className="slot-label light xs">raffled</text>}
          </>
        );
        if (prize) {
          return (
            <Link key={s.key} href="/prime" className="slot-link" aria-label="Prime spot, raffled">
              <g>{inner}</g>
            </Link>
          );
        }
        return open ? (
          <Link key={s.key} href={`/slot/${s.key}`} className="slot-link" aria-label={`Bid on ${s.label}, ${s.width_cm} by ${s.height_cm} cm`}>
            <g>{inner}</g>
          </Link>
        ) : (
          <g key={s.key}>{inner}</g>
        );
      })}
    </svg>
  );
}
