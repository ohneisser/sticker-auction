import Link from "next/link";
import type { SlotPublic } from "@/lib/format";
import { usd } from "@/lib/format";

// The lid is drawn in millimetres (356 x 248). The photo of the lid sticker sits underneath;
// LID tells the map where the metal lid is inside that photo, so the spots line up at every screen size.
const LID = { left: 0.0176, top: 0.0168, width: 0.9531, height: 0.97 };
const IMG_W = 356 / LID.width;
const IMG_H = 248 / LID.height;
const IMG_X = -LID.left * IMG_W;
const IMG_Y = -LID.top * IMG_H;

function wobblyRect(x: number, y: number, w: number, h: number, seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) & 0xffff;
  const r = () => { n = (n * 9301 + 49297) % 233280; return n / 233280 - 0.5; };
  const j = Math.min(w, h) * 0.035;
  const p = (px: number, py: number) => `${(px + r() * j).toFixed(2)} ${(py + r() * j).toFixed(2)}`;
  const c = (px: number, py: number) => `${(px + r() * j * 2).toFixed(2)} ${(py + r() * j * 2).toFixed(2)}`;
  return `M ${p(x, y)} Q ${c(x + w / 2, y)} ${p(x + w, y)} Q ${c(x + w, y + h / 2)} ${p(x + w, y + h)} Q ${c(x + w / 2, y + h)} ${p(x, y + h)} Q ${c(x, y + h / 2)} ${p(x, y)} Z`;
}

export default function LaptopMap({ slots }: { slots: SlotPublic[] }) {
  return (
    <svg viewBox={`${IMG_X} ${IMG_Y} ${IMG_W} ${IMG_H}`} className="w-full h-auto" role="img" aria-label="Map of sticker spots on the laptop lid">
      <image className="lid-photo" href="/lid.webp" x={IMG_X} y={IMG_Y} width={IMG_W} height={IMG_H} preserveAspectRatio="none" />
      {slots.map((s) => {
        const w = s.width_cm * 10;
        const h = s.height_cm * 10;
        const sold = s.status !== "open";
        const small = w < 50 || h < 40;
        const prime = s.key === "prime";
        const inner = (
          <>
            <path d={wobblyRect(s.x_mm, s.y_mm, w, h, s.key)} className={`slot-rect ${sold ? "sold" : ""} ${s.reserved ? "held" : ""}`} />
            <text x={s.x_mm + w / 2} y={s.y_mm + h / 2 + (small ? 1.6 : 2.2) - (prime ? 3 : 0)} textAnchor="middle" className={`slot-label ${small ? "xs" : ""} ${sold ? "light" : ""}`}>
              {sold ? "Sold" : s.reserved ? "Held" : usd(s.price_cents)}
            </text>
            {prime && !sold && <text x={s.x_mm + w / 2} y={s.y_mm + h / 2 + 6} textAnchor="middle" className="slot-label xs">Prime</text>}
          </>
        );
        return sold ? (
          <g key={s.key}>{inner}</g>
        ) : (
          <Link key={s.key} href={`/slot/${s.key}`} className="slot-link" aria-label={`Buy ${s.label}, ${s.width_cm} by ${s.height_cm} cm`}><g>{inner}</g></Link>
        );
      })}
    </svg>
  );
}
