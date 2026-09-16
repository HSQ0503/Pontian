"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Title, ease } from "../ui";

export function Shift({ print }: { print?: boolean }) {
  const { t } = useT();
  const s = t.shift;
  const [after, setAfter] = useState(!!print);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6 });

  useEffect(() => {
    if (print || !inView || touched || after) return;
    const id = window.setTimeout(() => setAfter(true), 2400);
    return () => window.clearTimeout(id);
  }, [inView, touched, after, print]);

  const set = (v: boolean) => {
    setTouched(true);
    setAfter(v);
  };

  if (print) {
    return (
      <Chapter index={8} print source={s.source}>
        <Title>{s.title}</Title>
        <Exhibit n={8}>
          <div className="grid grid-cols-[1.1fr_1fr_1fr] border-t border-line">
            <div className="py-2" />
            <div className="label py-2 text-mist/60">{s.before}</div>
            <div className="label py-2 text-sky">{s.after}</div>
            {s.rows.map((r) => (
              <div key={r.name} className="contents">
                <div className="font-display border-t border-line py-4 pr-8 text-paper text-[1.2rem]">{r.name}</div>
                <div className="border-t border-line py-4 pr-8 text-mist leading-relaxed">{r.before}</div>
                <div className="border-t border-line py-4 text-paper leading-relaxed">{r.after}</div>
              </div>
            ))}
          </div>
        </Exhibit>
      </Chapter>
    );
  }

  return (
    <Chapter index={8} source={s.source}>
      <Title>{s.title}</Title>
      <Exhibit n={8}>
        <div ref={ref}>
          <div role="tablist" className="label relative inline-grid grid-cols-2 border border-line-strong">
            <motion.span
              aria-hidden
              className="absolute inset-y-0 w-1/2 bg-sky"
              animate={{ left: after ? "50%" : "0%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
            />
            <button type="button" role="tab" aria-selected={!after} onClick={() => set(false)} className={`relative z-10 px-4 py-3 transition-colors md:px-5 md:py-2 ${after ? "text-mist" : "text-ink"}`}>
              {s.before}
            </button>
            <button type="button" role="tab" aria-selected={after} onClick={() => set(true)} className={`relative z-10 px-4 py-3 transition-colors md:px-5 md:py-2 ${after ? "text-ink" : "text-mist"}`}>
              {s.after}
            </button>
          </div>

          <ul className="mt-4 border-t border-line short:mt-3 md:mt-5">
            {s.rows.map((r, i) => (
              <li key={r.name} className="grid gap-1 border-b border-line py-3 short:py-2 md:grid-cols-[1fr_1.5fr] md:gap-8 md:py-3.5">
                <span className="font-display text-paper text-[1rem] leading-tight short:text-[0.95rem] md:text-[1.15rem]">{r.name}</span>
                <span className="relative min-h-[2.4rem] short:min-h-[2.1rem] md:min-h-0">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={after ? "a" : "b"}
                      initial={{ opacity: 0, x: after ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: after ? -10 : 10 }}
                      transition={{ duration: 0.35, ease, delay: i * 0.04 }}
                      className={`block text-[0.9rem] leading-snug short:text-[0.83rem] md:text-[1rem] ${after ? "text-paper" : "text-mist"}`}
                    >
                      {after ? r.after : r.before}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Exhibit>
    </Chapter>
  );
}
