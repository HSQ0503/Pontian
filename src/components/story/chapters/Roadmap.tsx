"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Title, ease } from "../ui";

// Six months in six columns, with the three phases as spans above. On a phone
// the columns collapse to a month selector plus the list for that month.
export function Roadmap({ print }: { print?: boolean }) {
  const { t } = useT();
  const r = t.roadmap;
  const n = r.months.length;
  const [idx, setIdx] = useState(0);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6 });

  useEffect(() => {
    if (print || !inView || touched) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % n), 2600);
    return () => window.clearInterval(id);
  }, [inView, touched, n, print]);

  const pick = (i: number) => {
    setTouched(true);
    setIdx(i);
  };

  return (
    <Chapter index={11} print={print} source={r.source}>
      <Title>{r.title}</Title>
      <Exhibit n={11}>
        <div ref={ref}>
          {/* Phase spans */}
          <div className="grid grid-cols-6 gap-px">
            {r.phases.map((p) => (
              <div key={p.name} className="label border-t border-sky/60 pt-1.5 text-sky/80" style={{ gridColumn: `${p.from} / ${p.to + 1}` }}>
                {p.name}
              </div>
            ))}
          </div>

          {/* Month headers */}
          <div className="mt-3 grid grid-cols-6 gap-px border-b border-line md:mt-4">
            {r.months.map((m, i) => {
              const on = print || i === idx;
              return (
                <button
                  key={m.name}
                  type="button"
                  disabled={print}
                  onClick={() => pick(i)}
                  aria-selected={on}
                  role="tab"
                  className={`relative pb-2 text-left transition-colors ${on ? "text-paper" : "text-mist/60"}`}
                >
                  <span className="label tabular block">
                    {r.monthLabel} {i + 1}
                  </span>
                  <span className="font-display mt-0.5 hidden truncate text-[0.82rem] leading-tight md:block md:text-[1rem]">{m.name}</span>
                  {on && !print && (
                    <motion.span layoutId="month-underline" className="absolute inset-x-0 -bottom-px h-px bg-sky" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop and print: six columns of items. Phone: the selected month. */}
          <div className="hidden grid-cols-6 gap-3 pt-3 md:grid">
            {r.months.map((m, i) => {
              const on = print || i === idx;
              return (
                <ul key={m.name} className={`grid gap-1.5 text-[0.82rem] leading-snug transition-opacity duration-500 ${on ? "opacity-100" : "opacity-45"}`}>
                  {m.items.map((it) => (
                    <li key={it} className={`flex gap-2 ${on ? "text-paper" : "text-mist"}`}>
                      <span className={`mt-[0.5em] size-1 shrink-0 ${on ? "bg-sky" : "bg-mist/50"}`} />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              );
            })}
          </div>
          {!print && (
            <div className="min-h-[6.5rem] pt-3 md:hidden">
              <AnimatePresence mode="wait">
                <motion.ul key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }} className="grid gap-1.5">
                  <li className="font-display mb-1 text-paper text-[1.15rem]">{r.months[idx].name}</li>
                  {r.months[idx].items.map((it) => (
                    <li key={it} className="flex gap-2.5 text-[0.9rem] leading-snug text-paper short:text-[0.84rem]">
                      <span className="mt-[0.5em] size-1 shrink-0 bg-sky" />
                      <span>{it}</span>
                    </li>
                  ))}
                </motion.ul>
              </AnimatePresence>
            </div>
          )}
        </div>
      </Exhibit>
    </Chapter>
  );
}
