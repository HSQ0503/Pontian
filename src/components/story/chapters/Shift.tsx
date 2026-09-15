"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Foot, Kicker, Stage, Title, ease } from "../ui";

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

  if (print) {
    return (
      <Chapter id="c5" index={4} print>
        <Kicker n={5} />
        <Title>{s.title}</Title>
        <div className="mt-12 grid grid-cols-[1.1fr_1fr_1fr] border-t border-line">
          <div className="py-3 text-mist/60 text-sm uppercase tracking-[0.2em]" />
          <div className="py-3 text-mist/60 text-sm uppercase tracking-[0.2em]">
            {s.before}
          </div>
          <div className="py-3 text-sky text-sm uppercase tracking-[0.2em]">
            {s.after}
          </div>
          {s.rows.map((r) => (
            <div key={r.name} className="contents">
              <div className="font-display border-t border-line py-5 pr-8 text-paper text-2xl">
                {r.name}
              </div>
              <div className="border-t border-line py-5 pr-8 text-mist text-lg leading-relaxed">
                {r.before}
              </div>
              <div className="border-t border-line py-5 text-paper text-lg leading-relaxed">
                {r.after}
              </div>
            </div>
          ))}
        </div>
        <Foot>{s.footer}</Foot>
      </Chapter>
    );
  }

  const set = (v: boolean) => {
    setTouched(true);
    setAfter(v);
  };

  return (
    <Chapter id="c5" index={4}>
      <Kicker n={5} />
      <Title>{s.title}</Title>

      <Stage>
        <div ref={ref}>
          <div
            role="tablist"
            className="relative inline-grid grid-cols-2 rounded-full border border-line-strong p-1 text-[0.72rem] uppercase tracking-[0.18em]"
          >
            <motion.span
              aria-hidden
              className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-sky"
              animate={{ left: after ? "50%" : "0.25rem" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={!after}
              onClick={() => set(false)}
              className={`relative z-10 px-5 py-2 transition-colors ${after ? "text-mist" : "text-ink"}`}
            >
              {s.before}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={after}
              onClick={() => set(true)}
              className={`relative z-10 px-5 py-2 transition-colors ${after ? "text-ink" : "text-mist"}`}
            >
              {s.after}
            </button>
          </div>

          <ul className="mt-5 divide-y divide-line border-y border-line short:mt-3 md:mt-7">
            {s.rows.map((r, i) => (
              <li
                key={r.name}
                className="grid gap-1 py-3 short:py-2 md:grid-cols-[1fr_1.4fr] md:gap-8 md:py-4"
              >
                <span className="font-display text-paper text-[1.05rem] leading-tight short:text-[0.98rem] md:text-2xl">
                  {r.name}
                </span>
                <span className="relative min-h-[2.6rem] short:min-h-[2.2rem] md:min-h-0">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={after ? "a" : "b"}
                      initial={{ opacity: 0, x: after ? 12 : -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: after ? -12 : 12 }}
                      transition={{ duration: 0.4, ease, delay: i * 0.05 }}
                      className={`block text-[0.92rem] leading-snug short:text-[0.84rem] md:text-lg ${after ? "text-paper" : "text-mist"}`}
                    >
                      {after ? r.after : r.before}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Stage>

      <Foot>{s.footer}</Foot>
    </Chapter>
  );
}
