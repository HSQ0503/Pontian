"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Lead, Title, ease } from "../ui";

// Scattered positions as percentages of the field. Chosen by hand so nothing
// overlaps at 320px wide and the field reads as messy rather than random.
const scattered = [
  { x: 10, y: 14 },
  { x: 66, y: 8 },
  { x: 80, y: 46 },
  { x: 14, y: 54 },
  { x: 46, y: 74 },
  { x: 76, y: 84 },
];

const ring = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + Math.cos(a) * 38, y: 50 + Math.sin(a) * 38 };
});

export function Scatter({ print }: { print?: boolean }) {
  const { t } = useT();
  const s = t.scatter;
  const [gathered, setGathered] = useState(!!print);
  const [touched, setTouched] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inView = useInView(fieldRef, { amount: 0.6 });

  useEffect(() => {
    if (print || !inView || touched || gathered) return;
    const id = window.setTimeout(() => setGathered(true), 2600);
    return () => window.clearTimeout(id);
  }, [inView, touched, gathered, print]);

  const toggle = () => {
    setTouched(true);
    setGathered((g) => !g);
  };

  return (
    <Chapter index={5} print={print}>
      <Title>{s.title}</Title>
      <Lead>{s.body}</Lead>
      <Exhibit n={5}>
        <div className="grid items-center gap-4 md:grid-cols-[1fr_1fr] md:gap-12">
          <div
            ref={fieldRef}
            onClick={print ? undefined : toggle}
            className={`relative mx-auto w-full max-w-md select-none ${print ? "h-[20rem]" : "h-48 cursor-pointer short:h-40 md:h-[17rem]"}`}
            role={print ? undefined : "button"}
            aria-pressed={gathered}
          >
            {s.nodes.map((label, i) => {
              const p = gathered ? ring[i] : scattered[i];
              return (
                <motion.div
                  key={label}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  animate={{ left: `${p.x}%`, top: `${p.y}%` }}
                  transition={{ type: "spring", stiffness: 70, damping: 17, delay: gathered ? i * 0.04 : (5 - i) * 0.03 }}
                >
                  <span
                    className={`block whitespace-nowrap border px-2.5 py-1 text-[0.76rem] transition-colors duration-700 md:text-[0.85rem] ${
                      gathered ? "border-sky/50 bg-ink text-sky" : "border-mist/40 bg-ink text-mist"
                    }`}
                  >
                    {label}
                  </span>
                </motion.div>
              );
            })}

            <AnimatePresence>
              {gathered &&
                ring.map((_, i) => (
                  <motion.span
                    key={`spoke-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                    className="absolute left-1/2 top-1/2 h-px origin-left bg-sky/30"
                    style={{ width: "38%", transform: `rotate(${(i / 6) * 360 - 90}deg)` }}
                  />
                ))}
            </AnimatePresence>

            <AnimatePresence>
              {gathered && (
                <motion.div
                  key="center"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, ease, delay: 0.25 }}
                  className="absolute left-1/2 top-1/2 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center border border-sky bg-ink text-center md:size-28"
                >
                  <span className="font-display px-2 text-sky text-[0.95rem] leading-tight md:text-[1.05rem]">{s.center}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-start gap-3">
            <AnimatePresence mode="wait">
              <motion.p
                key={gathered ? "after" : "before"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                className={`min-h-[2.6rem] leading-relaxed text-paper ${print ? "text-[1.2rem]" : "text-[0.95rem] short:text-[0.88rem] md:text-[1.05rem]"}`}
              >
                {gathered ? s.caption : "\u00a0"}
              </motion.p>
            </AnimatePresence>
            {!print && (
              <button
                type="button"
                onClick={toggle}
                className={`label border px-4 py-2 transition-colors ${
                  gathered ? "border-line text-mist hover:text-paper" : "border-sky/60 text-sky hover:bg-sky/10"
                }`}
              >
                {gathered ? t.ui.undo : s.button}
              </button>
            )}
          </div>
        </div>
      </Exhibit>
    </Chapter>
  );
}
