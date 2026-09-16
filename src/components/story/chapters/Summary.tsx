"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, StepButton, Title, ease, useStepper } from "../ui";

// Executive summary in the Situation / Complication / Question / Answer shape.
// Rows reveal one at a time so the presenter controls the pace.
export function Summary({ print }: { print?: boolean }) {
  const { t } = useT();
  const s = t.summary;
  const { step, advance, done } = useStepper(1, s.rows.length, print);
  const shown = print ? s.rows.length : Math.max(1, step);

  return (
    <Chapter index={1} print={print}>
      <Title>{s.title}</Title>
      <Exhibit n={1}>
        <ol className="border-t border-line">
          {s.rows.map((r, i) => {
            const on = i < shown;
            const isAnswer = i === s.rows.length - 1;
            return (
              <li
                key={r.label}
                className={`grid gap-0.5 border-b border-line py-2.5 transition-opacity duration-500 short:py-2 md:grid-cols-[9rem_1fr] md:gap-8 md:py-4 ${
                  on ? "opacity-100" : "opacity-20"
                }`}
              >
                <span className={`label pt-1 ${isAnswer && on ? "text-sky" : "text-mist/70"}`}>{r.label}</span>
                <AnimatePresence initial={false}>
                  {on ? (
                    <motion.p
                      key="body"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease }}
                      className={`max-w-[62ch] leading-snug md:leading-relaxed ${isAnswer ? "text-paper text-[0.95rem] short:text-[0.88rem] md:text-[1.12rem]" : "text-mist text-[0.9rem] short:text-[0.84rem] md:text-[1.02rem]"}`}
                    >
                      {r.body}
                    </motion.p>
                  ) : (
                    <span key="ph" className="h-[1.6rem] w-2/3 border-b border-dotted border-line" />
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
        {!print && (
          <StepButton onClick={advance} done={done}>
            {t.ui.stepHint}
          </StepButton>
        )}
      </Exhibit>
    </Chapter>
  );
}
