"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, StepButton, Title, ease, useStepper } from "../ui";

// The path of one answer, revealed one stage at a time. From stage four on,
// the panel shows what the person receives: an answer with its source.
export function Flow({ print }: { print?: boolean }) {
  const { t } = useT();
  const f = t.flow;
  const n = f.steps.length;
  const { step, advance, done } = useStepper(7, n, print);
  const shown = print ? n : Math.max(1, step);
  const showSample = print || shown >= 4;

  return (
    <Chapter index={7} print={print} takeaway={f.takeaway}>
      <Title>{f.title}</Title>
      <Exhibit n={7}>
        <div className="grid gap-5 md:grid-cols-[1.1fr_1fr] md:gap-12">
          <ol className="relative border-l border-line">
            {f.steps.map((s, i) => {
              const on = i < shown;
              const current = i === shown - 1;
              return (
                <li key={s.name} className={`relative pl-5 transition-opacity duration-500 md:pl-6 ${on ? "opacity-100" : "opacity-25"} ${i < n - 1 ? "pb-3 md:pb-4" : ""}`}>
                  <span
                    className={`absolute -left-[0.3rem] top-[0.45rem] size-[0.55rem] border transition-colors duration-500 ${
                      on ? "border-sky bg-sky" : "border-line-strong bg-ink"
                    } ${current && !print ? "outline outline-2 outline-offset-2 outline-sky/30" : ""}`}
                  />
                  <div className="flex items-baseline gap-3">
                    <span className={`tabular text-[0.75rem] ${on ? "text-sky" : "text-mist/50"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={`font-display text-[1.02rem] leading-tight md:text-[1.15rem] ${on ? "text-paper" : "text-mist"}`}>{s.name}</span>
                  </div>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.p
                        key="b"
                        initial={print ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        transition={{ duration: 0.45, ease }}
                        className="overflow-hidden text-[0.86rem] leading-snug text-mist short:text-[0.8rem] md:text-[0.95rem]"
                      >
                        <span className="block pt-1">{s.body}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-col justify-center">
            {!showSample && (
              <div className="hidden min-h-[11rem] items-center justify-center border border-dashed border-line md:flex" aria-hidden>
                <span className="label text-mist/40">{f.steps[3].name}</span>
              </div>
            )}
            <AnimatePresence>
              {showSample && (
                <motion.div
                  key="sample"
                  initial={print ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease }}
                  className="border border-line bg-ink-2"
                >
                  <div className="label flex items-center justify-between border-b border-line px-4 py-2 text-mist/60">
                    <span>Pontian</span>
                    <span className="tabular">12:04</span>
                  </div>
                  <div className="px-4 py-3 md:px-5 md:py-4">
                    <p className="text-[0.85rem] text-mist md:text-[0.92rem]">{f.sample.question}</p>
                    <p className="mt-3 text-[0.98rem] leading-snug text-paper md:text-[1.08rem]">{f.sample.answer}</p>
                    <div className="mt-3 inline-flex max-w-full items-center gap-2 border border-sky/40 px-2.5 py-1 text-[0.72rem] text-sky md:text-[0.78rem]">
                      <span className="size-1.5 bg-sky" />
                      <span className="truncate">{f.sample.source}</span>
                    </div>
                    <p className="label mt-3 text-mist/50">{f.sample.meta}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {!print && (
          <StepButton onClick={advance} done={done}>
            {t.ui.stepHint}
          </StepButton>
        )}
      </Exhibit>
    </Chapter>
  );
}
