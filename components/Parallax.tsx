"use client";
import { useEffect, useRef } from "react";

// Thin white grid in the background. Repeats forever and scrolls slower than the page (parallax).
const CELL = 96;

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
      raf = requestAnimationFrame(() => {
        const shift = (window.scrollY * 0.35) % CELL;
        el.style.transform = `translate3d(0, ${-shift}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="parallax" aria-hidden="true">
      <div ref={ref} className="parallax-layer">
        <svg className="parallax-grid" width="100%" height="100%">
          <defs>
            <pattern id="grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
              <path d={`M ${CELL} 0.6 L 0 0.4 M 0.4 0 L 0.6 ${CELL}`} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  );
}
