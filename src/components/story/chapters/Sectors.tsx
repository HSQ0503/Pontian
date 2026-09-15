"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Title, ease } from "../ui";

// Sector selector on the left (tabs on a phone), the two paragraphs on the
// right. Cycles on its own until someone picks a sector.
export function Sectors({ print }: { print?: boolean }) {
  const { t } = useT();
  const s = t.sectors;
  const [idx, setIdx] = useState(0);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (print || !inView || touched) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % s.items.length), 3200);
    return () => window.clearInterval(id);
  }, [inView, touched, print, s.items.length]);

  // Keep the selected tab visible in the phone strip. Scroll the strip only,
  // never the page: scrollIntoView would drag the whole deck here on mount.
  useEffect(() => {
    const el = tabRefs.current[idx];
    const strip = el?.parentElement;
    if (!el || !strip || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.offsetWidth / 2, behavior: "smooth" });
  }, [idx]);

  if (print) {
    return (
      <Chapter index={9} print source={s.source}>
        <Title>{s.title}</Title>
        <Exhibit n={9}>
          <div className="grid grid-cols-3 border-l border-t border-line">
            {s.items.map((it) => (
              <div key={it.name} className="border-b border-r border-line p-5">
                <div className="font-display text-paper text-[1.25rem] leading-tight">{it.name}</div>
                <div className="label mt-3 text-mist/60">{s.lostLabel}</div>
                <p className="mt-1 text-[0.95rem] leading-snug text-mist">{it.lost}</p>
                <div className="label mt-3 text-sky/80">{s.changeLabel}</div>
                <p className="mt-1 text-[0.95rem] leading-snug text-paper">{it.change}</p>
              </div>
            ))}
          </div>
        </Exhibit>
      </Chapter>
    );
  }

  const cur = s.items[idx];

  return (
    <Chapter index={9} source={s.source}>
      <Title>{s.title}</Title>
      <Exhibit n={9}>
        <div ref={ref} className="grid gap-4 md:grid-cols-[15rem_1fr] md:gap-12">
          <div className="no-scrollbar -mx-6 flex gap-1 overflow-x-auto px-6 md:mx-0 md:flex-col md:gap-0 md:overflow-visible md:border-t md:border-line md:px-0" role="tablist">
            {s.items.map((it, i) => {
              const on = i === idx;
              return (
                <button
                  key={it.name}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setTouched(true);
                    setIdx(i);
                  }}
                  className={`shrink-0 whitespace-nowrap border-b px-3 py-2 text-left text-[0.85rem] transition-colors md:flex md:items-center md:justify-between md:whitespace-normal md:border-line md:px-0 md:py-3 md:text-[1rem] ${
                    on ? "border-sky text-paper" : "border-line text-mist hover:text-paper"
                  }`}
                >
                  <span>{it.name}</span>
                  <span className={`hidden text-sky md:inline ${on ? "opacity-100" : "opacity-0"}`} aria-hidden>
                    →
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-h-[9rem] short:min-h-[8rem] md:min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4, ease }}
                className="grid gap-4 md:gap-6"
              >
                <div className="font-display hidden text-paper text-[1.6rem] leading-tight md:block">{cur.name}</div>
                <div>
                  <div className="label text-mist/60">{s.lostLabel}</div>
                  <p className="mt-1 max-w-[52ch] text-[0.92rem] leading-snug text-mist short:text-[0.85rem] md:text-[1.02rem]">{cur.lost}</p>
                </div>
                <div>
                  <div className="label text-sky/80">{s.changeLabel}</div>
                  <p className="mt-1 max-w-[52ch] text-[0.95rem] leading-snug text-paper short:text-[0.88rem] md:text-[1.08rem]">{cur.change}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Exhibit>
    </Chapter>
  );
}
