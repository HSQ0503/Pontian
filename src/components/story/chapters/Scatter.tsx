"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Body, Chapter, Kicker, Stage, Title, ease } from "../ui";

// Scattered positions as percentages of the field. Chosen by hand so nothing
// overlaps at 320px wide and the field reads as messy, not random.
const scattered = [
  { x: 8, y: 12 },
  { x: 64, y: 6 },
  { x: 78, y: 42 },
  { x: 14, y: 52 },
  { x: 46, y: 70 },
  { x: 74, y: 80 },
];

// Gathered: a ring around the center.
const ring = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + Math.cos(a) * 36, y: 50 + Math.sin(a) * 36 };
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
    <Chapter id="c3" index={2} print={print}>
      <Kicker n={3} />
      <Title>{s.title}</Title>
      <Body>{s.body}</Body>

      <Stage>
        <div
          className={
            print ? "grid grid-cols-2 items-center gap-16" : "md:grid md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12"
          }
        >
          <div
            ref={fieldRef}
            onClick={print ? undefined : toggle}
            className={`relative mx-auto w-full max-w-md select-none ${print ? "h-[24rem]" : "h-52 cursor-pointer short:h-44 md:h-64"}`}
            role={print ? undefined : "button"}
            aria-pressed={gathered}
          >
            {s.nodes.map((label, i) => {
              const p = gathered ? ring[i] : scattered[i];
              return (
                <motion.div
                  key={label}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  animate={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    opacity: gathered ? 0.85 : 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 70,
                    damping: 16,
                    delay: gathered ? i * 0.04 : (5 - i) * 0.03,
                  }}
                >
                  <span
                    className={`block whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.78rem] transition-colors duration-700 md:text-sm ${
                      gathered
                        ? "border-sky/40 bg-ink text-sky"
                        : "border-line-strong bg-ink-2 text-mist"
                    }`}
                  >
                    {label}
                  </span>
                </motion.div>
              );
            })}

            <AnimatePresence>
              {gathered && (
                <motion.div
                  key="center"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.7, ease, delay: 0.25 }}
                  className="absolute left-1/2 top-1/2 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-sky bg-sky/10 text-center shadow-[0_0_40px_rgba(143,208,250,0.35)] md:size-32"
                >
                  <span className="font-display px-2 text-sky text-sm leading-tight md:text-base">
                    {s.center}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thin spokes appear once gathered. */}
            <AnimatePresence>
              {gathered &&
                ring.map((p, i) => (
                  <motion.span
                    key={`spoke-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 + i * 0.05 }}
                    className="absolute left-1/2 top-1/2 h-px origin-left bg-sky/25"
                    style={{
                      width: "36%",
                      transform: `rotate(${(i / 6) * 360 - 90}deg)`,
                    }}
                  />
                ))}
            </AnimatePresence>
          </div>

          <div
            className={
              print ? "" : "mt-3 flex flex-col items-start gap-3 md:mt-0"
            }
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={gathered ? "after" : "before"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                className={`text-paper leading-relaxed ${print ? "text-2xl" : "min-h-[2.8rem] text-[0.95rem] short:min-h-[2.4rem] short:text-[0.88rem] md:text-lg"}`}
              >
                {gathered ? s.caption : "\u00a0"}
              </motion.p>
            </AnimatePresence>
            {!print && (
              <button
                type="button"
                onClick={toggle}
                className={`rounded-full border px-5 py-2 text-[0.72rem] uppercase tracking-[0.2em] transition-colors ${
                  gathered
                    ? "border-line text-mist hover:text-paper"
                    : "border-sky/60 text-sky hover:bg-sky/10"
                }`}
              >
                {gathered ? t.ui.undo : s.button}
              </button>
            )}
          </div>
        </div>
      </Stage>
    </Chapter>
  );
}
