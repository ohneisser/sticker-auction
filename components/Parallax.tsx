"use client";
import { useEffect, useRef } from "react";

// Thin white grid in the background, scrolling slower than the page (parallax).
const CELL = 96;
const COLS = 40;
const ROWS = 60;

export default function Parallax() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const onScroll = () => {
      if (reduce) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { el.style.transform = `translate3d(0, ${-window.scrollY * 0.35}px, 0)`; });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  const W = COLS * CELL;
  const H = ROWS * CELL;
  return (
    <div className="parallax" aria-hidden="true">
      <div ref={ref} className="parallax-layer">
        <svg className="parallax-grid" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMin slice">
          {Array.from({ length: COLS + 1 }, (_, i) => (
            <line key={`v${i}`} x1={i * CELL + Math.sin(i * 1.7) * 1.5} y1={0} x2={i * CELL + Math.cos(i * 2.3) * 1.5} y2={H} />
          ))}
          {Array.from({ length: ROWS + 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * CELL + Math.cos(i * 1.3) * 1.5} x2={W} y2={i * CELL + Math.sin(i * 2.9) * 1.5} />
          ))}
        </svg>
      </div>
    </div>
  );
}
