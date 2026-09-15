"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Hint, Title, ease } from "../ui";

// Six terms in a two-column ruled grid. Tap a term to read the line under it.
export function Commercial({ print }: { print?: boolean }) {
  const { t } = useT();
  const c = t.commercial;
  const [open, setOpen] = useState<number | null>(print ? null : 0);

  return (
    <Chapter index={13} print={print} source={c.source}>
      <Title>{c.title}</Title>
      <Exhibit n={13}>
        <ol className="grid border-l border-t border-line md:grid-cols-2">
          {c.terms.map((term, i) => {
            const on = print || open === i;
            return (
              <li key={term.name} className="border-b border-r border-line">
                <button
                  type="button"
                  disabled={print}
                  onClick={() => setOpen(on ? null : i)}
                  aria-expanded={on}
                  className="grid w-full grid-cols-[1.8rem_1fr] gap-2 px-3 py-3 text-left short:py-2.5 md:px-4 md:py-4"
                >
                  <span className={`tabular pt-0.5 text-[0.78rem] ${on ? "text-sky" : "text-mist/50"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className={`font-display block text-[1.02rem] leading-tight md:text-[1.15rem] ${on ? "text-paper" : "text-mist"}`}>{term.name}</span>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.span
                          key="b"
                          initial={print ? false : { height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease }}
                          className="block overflow-hidden text-[0.86rem] leading-snug text-mist short:text-[0.8rem] md:text-[0.95rem]"
                        >
                          <span className="block pt-1">{term.body}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {!print && (
          <div className="mt-3">
            <span className="md:hidden">
              <Hint>{t.ui.tapHint}</Hint>
            </span>
            <span className="hidden md:inline">
              <Hint>{t.ui.clickHint}</Hint>
            </span>
          </div>
        )}
      </Exhibit>
    </Chapter>
  );
}
