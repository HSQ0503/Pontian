"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, StepButton, Title, rise, useStepper } from "../ui";

// Five controls revealed one at a time on the left, acceptance targets as a
// ruled table on the right. A phone shows one of the two at a time.
export function Controls({ print }: { print?: boolean }) {
  const { t } = useT();
  const c = t.controls;
  const n = c.controls.length;
  const { step, advance, done } = useStepper(12, n, print);
  const shown = print ? n : Math.max(1, step);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: true });
  const [tab, setTab] = useState<"controls" | "kpis">("controls");

  return (
    <Chapter index={12} print={print} source={c.source}>
      <Title>{c.title}</Title>
      <Exhibit n={12}>
        {!print && (
          <div role="tablist" className="label mb-4 inline-grid grid-cols-2 border border-line-strong short:mb-3 md:hidden">
            <button type="button" role="tab" aria-selected={tab === "controls"} onClick={() => setTab("controls")} className={`px-4 py-2 ${tab === "controls" ? "bg-sky text-ink" : "text-mist"}`}>
              {c.controlsLabel}
            </button>
            <button type="button" role="tab" aria-selected={tab === "kpis"} onClick={() => setTab("kpis")} className={`px-4 py-2 ${tab === "kpis" ? "bg-sky text-ink" : "text-mist"}`}>
              {c.kpiLabel}
            </button>
          </div>
        )}

        <div ref={ref} className="grid gap-5 md:grid-cols-[1.15fr_1fr] md:gap-12">
          <div className={`${!print && tab !== "controls" ? "hidden md:block" : ""}`}>
            <ol className="border-t border-line">
              {c.controls.map((k, i) => {
                const on = i < shown;
                return (
                  <li key={k.name} className={`grid grid-cols-[1.6rem_1fr] gap-2 border-b border-line py-2.5 transition-opacity duration-500 short:py-1.5 md:py-3 ${on ? "opacity-100" : "opacity-25"}`}>
                    <span className={`tabular pt-0.5 text-[0.78rem] ${on ? "text-sky" : "text-mist/50"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className={`font-display block text-[1rem] leading-tight short:text-[0.94rem] md:text-[1.12rem] ${on ? "text-paper" : "text-mist"}`}>{k.name}</span>
                      <span className={`mt-0.5 block text-[0.85rem] leading-snug text-mist transition-opacity duration-500 short:text-[0.8rem] md:text-[0.92rem] ${on ? "opacity-100" : "opacity-0"}`}>
                        {k.body}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {!print && (
              <StepButton onClick={advance} done={done}>
                {t.ui.stepHint}
              </StepButton>
            )}
          </div>

          <div className={`${!print && tab !== "kpis" ? "hidden md:block" : ""}`}>
            <div className="label border-t border-sky/60 pt-2 text-sky/80">{c.kpiLabel}</div>
            <dl className="mt-1 grid grid-cols-[minmax(4.5rem,auto)_1fr] gap-x-4 border-t border-line text-[0.84rem] md:text-[0.9rem]">
              {c.kpis.map((k, i) => (
                <motion.div
                  key={k.label}
                  className="contents"
                  variants={rise}
                  initial={print ? "show" : "hidden"}
                  animate={inView || print ? "show" : "hidden"}
                  transition={{ delay: 0.15 + i * 0.07 }}
                >
                  <dt className="font-display tabular border-b border-line py-1.5 text-paper text-[1.05rem] md:py-2 md:text-[1.15rem]">{k.value}</dt>
                  <dd className="border-b border-line py-1.5 leading-snug text-mist md:py-2">{k.label}</dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </Exhibit>
    </Chapter>
  );
}
