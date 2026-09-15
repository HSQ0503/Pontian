"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Hint, Title, ease } from "../ui";

// Horizontal bar chart. Bars draw in when the page enters view; tapping a bar
// shows the definition behind the number.
export function Adoption({ print }: { print?: boolean }) {
  const { t } = useT();
  const a = t.adoption;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: true });
  const [pick, setPick] = useState<number | null>(null);
  const max = Math.max(...a.bars.map((b) => b.value));

  return (
    <Chapter index={3} print={print} takeaway={a.takeaway} source={a.source}>
      <Title>{a.title}</Title>
      <Exhibit n={3} caption={a.caption}>
        <div ref={ref} className="grid gap-1.5 md:gap-2">
          {a.bars.map((b, i) => {
            const on = pick === i;
            const emphasis = i === 0 || i === a.bars.length - 1;
            return (
              <button
                key={b.label}
                type="button"
                disabled={print}
                onClick={() => setPick(on ? null : i)}
                className="group grid grid-cols-[minmax(7.5rem,11rem)_1fr_3.6rem] items-center gap-3 text-left md:grid-cols-[15rem_1fr_4.5rem] md:gap-5"
              >
                <span className={`text-[0.82rem] leading-tight md:text-[0.95rem] ${on ? "text-paper" : "text-mist"}`}>{b.label}</span>
                <span className="relative h-5 border-l border-line md:h-6">
                  <motion.span
                    className={`absolute inset-y-0 left-0 ${emphasis ? "bg-sky" : "bg-sky/35"} ${on ? "bg-sky" : ""}`}
                    initial={{ width: print ? `${(b.value / max) * 100}%` : 0 }}
                    animate={{ width: inView || print ? `${Math.max((b.value / max) * 100, 1.2)}%` : 0 }}
                    transition={{ duration: 0.9, ease, delay: i * 0.08 }}
                  />
                </span>
                <span className={`tabular text-right text-[0.9rem] md:text-[1rem] ${emphasis || on ? "text-paper" : "text-mist"}`}>{b.display}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 min-h-[1.4rem] md:mt-4">
          <AnimatePresence mode="wait">
            {pick !== null ? (
              <motion.p
                key={pick}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[0.85rem] text-paper md:text-[0.95rem]"
              >
                <span className="text-sky">{a.bars[pick].label}.</span> {a.bars[pick].note}
              </motion.p>
            ) : (
              !print && (
                <span key="hint">
                  <span className="md:hidden">
                    <Hint>{t.ui.tapHint}</Hint>
                  </span>
                  <span className="hidden md:inline">
                    <Hint>{t.ui.clickHint}</Hint>
                  </span>
                </span>
              )
            )}
          </AnimatePresence>
        </div>
      </Exhibit>
    </Chapter>
  );
}
