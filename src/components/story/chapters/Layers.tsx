"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Hint, Title, ease } from "../ui";

export function Layers({ print }: { print?: boolean }) {
  const { t } = useT();
  const l = t.layers;
  const [open, setOpen] = useState(0);

  return (
    <Chapter index={6} print={print} takeaway={l.takeaway}>
      <Title>{l.title}</Title>
      <Exhibit n={6}>
        <ol className={`border-t border-line ${print ? "grid grid-cols-2 gap-x-14 border-t-0" : ""}`}>
          {l.items.map((item, i) => {
            const isOpen = print || open === i;
            return (
              <li key={item.name} className={`border-b border-line ${print && i < 2 ? "border-t" : ""}`}>
                <button
                  type="button"
                  disabled={print}
                  onClick={() => setOpen(i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-baseline gap-4 py-3 text-left short:py-2 md:py-2.5"
                >
                  <span className={`tabular w-6 shrink-0 text-[0.78rem] ${isOpen ? "text-sky" : "text-mist/50"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={`font-display flex-1 text-[1.15rem] leading-tight transition-colors short:text-[1.05rem] md:text-[1.2rem] ${isOpen ? "text-paper" : "text-mist"}`}>
                    {item.name}
                  </span>
                  {!print && (
                    <span className={`relative size-3.5 shrink-0 self-center transition-transform duration-500 ${isOpen ? "rotate-45" : ""}`} aria-hidden>
                      <span className="absolute left-0 top-1/2 h-px w-full bg-sky" />
                      <span className="absolute left-1/2 top-0 h-full w-px bg-sky" />
                    </span>
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="body"
                      initial={print ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease }}
                      className="overflow-hidden"
                    >
                      <div className="pb-4 pl-10 short:pb-2.5 md:pb-4">
                        <p className={`max-w-[50ch] leading-relaxed text-mist ${print ? "text-[0.98rem]" : "text-[0.92rem] short:text-[0.85rem] short:leading-snug md:text-[0.95rem] md:leading-snug"}`}>
                          {item.body}
                        </p>
                        <Mock rows={item.mock} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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

// A single row lifted from the real screen: three cells separated by rules.
function Mock({ rows }: { rows: string[] }) {
  return (
    <div className="mt-3 inline-flex max-w-full flex-wrap border-l border-t border-line text-[0.72rem] text-mist short:hidden md:text-[0.78rem]">
      {rows.map((r, i) => (
        <span key={r} className={`border-b border-r border-line px-2.5 py-1.5 ${i === 0 ? "text-paper" : i === rows.length - 1 ? "text-sky" : ""}`}>
          {r}
        </span>
      ))}
    </div>
  );
}
