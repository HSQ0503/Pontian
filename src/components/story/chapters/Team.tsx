"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Hint, Title, ease } from "../ui";

// A ruled roster. Name, role and city always visible; the one-line
// description opens on tap on a phone and is always visible on a desktop.
export function Team({ print }: { print?: boolean }) {
  const { t } = useT();
  const tm = t.team;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Chapter index={14} print={print} takeaway={tm.footer}>
      <Title>{tm.title}</Title>
      <Exhibit n={14}>
        <ul className="border-t border-line">
          {tm.people.map((p, i) => {
            const on = print || open === i;
            return (
              <li key={p.name} className="border-b border-line">
                <button
                  type="button"
                  disabled={print}
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={on}
                  className="grid w-full grid-cols-[1fr_auto] items-baseline gap-x-4 py-2.5 text-left short:py-2 md:grid-cols-[15rem_14rem_1fr_6rem] md:gap-6 md:py-3"
                >
                  <span className="font-display text-paper text-[1.02rem] leading-tight md:text-[1.12rem]">{p.name}</span>
                  <span className="label tabular text-mist/60 md:order-last md:text-right">{p.city}</span>
                  <span className="col-span-2 text-[0.82rem] text-mist md:col-span-1 md:text-[0.92rem]">{p.role}</span>
                  <span className="hidden text-[0.9rem] leading-snug text-paper/85 md:block">{p.line}</span>
                </button>
                <AnimatePresence initial={false}>
                  {on && !print && (
                    <motion.p
                      key="line"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease }}
                      className="overflow-hidden text-[0.88rem] leading-snug text-paper/85 md:hidden"
                    >
                      <span className="block pb-2.5">{p.line}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
        {!print && (
          <div className="mt-3 md:hidden">
            <Hint>{t.ui.tapHint}</Hint>
          </div>
        )}
      </Exhibit>
    </Chapter>
  );
}
