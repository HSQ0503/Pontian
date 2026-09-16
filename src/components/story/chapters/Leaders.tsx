"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Hint, Title, ease } from "../ui";

// Three reference firms as a ruled table. On a phone each row opens on tap;
// on a desktop the table is fully visible.
export function Leaders({ print }: { print?: boolean }) {
  const { t } = useT();
  const l = t.leaders;
  const [open, setOpen] = useState(0);

  return (
    <Chapter index={4} print={print} takeaway={l.takeaway} source={l.source}>
      <Title>{l.title}</Title>
      <Exhibit n={4} caption={l.note}>
        <div className="border-t border-line">
          <div className="label hidden grid-cols-[8.5rem_12rem_1fr] gap-6 border-b border-line py-2 text-mist/50 md:grid">
            <span>{l.columns.firm}</span>
            <span>{l.columns.profile}</span>
            <span>{l.columns.what}</span>
          </div>
          {l.rows.map((r, i) => {
            const on = print || open === i;
            return (
              <div key={r.firm} className="border-b border-line">
                <button
                  type="button"
                  disabled={print}
                  onClick={() => setOpen(i)}
                  aria-expanded={on}
                  className="grid w-full grid-cols-1 gap-0.5 py-3 text-left short:py-2 md:grid-cols-[8.5rem_12rem_1fr] md:items-baseline md:gap-6 md:py-3"
                >
                  <span className="font-display text-paper text-[1.1rem] md:text-[1.1rem]">{r.firm}</span>
                  <span className="text-[0.8rem] text-mist md:text-[0.88rem]">{r.profile}</span>
                  <span className="col-span-2 hidden text-[0.9rem] leading-snug text-paper/90 md:col-span-1 md:block">
                    {r.what}
                    <span className="mt-1 block text-[0.75rem] text-mist/60">{r.source}</span>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease }}
                      className="overflow-hidden md:hidden"
                    >
                      <p className="pb-3 text-[0.9rem] leading-relaxed text-paper/90 short:pb-2 short:text-[0.82rem] short:leading-snug">
                        {r.what}
                        <span className="mt-1 block text-[0.72rem] text-mist/60">{r.source}</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        {!print && (
          <div className="mt-3 md:hidden">
            <Hint>{t.ui.tapHint}</Hint>
          </div>
        )}
      </Exhibit>
    </Chapter>
  );
}
