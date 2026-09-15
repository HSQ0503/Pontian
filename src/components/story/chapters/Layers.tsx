"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Body, Chapter, Hint, Kicker, Stage, Title, ease } from "../ui";

export function Layers({ print }: { print?: boolean }) {
  const { t } = useT();
  const l = t.layers;
  const [open, setOpen] = useState(0);

  return (
    <Chapter id="c4" index={3} print={print}>
      <Kicker n={4} />
      <Title>{l.title}</Title>
      {!print && <Body className="mt-3 md:mt-4">{l.intro}</Body>}

      <Stage>
        <ol
          className={`border-t border-line ${print ? "grid grid-cols-2 gap-x-16 border-t-0" : ""}`}
        >
          {l.items.map((item, i) => {
            const isOpen = print || open === i;
            return (
              <li
                key={item.name}
                className={`border-b border-line ${print && i === 0 ? "border-t" : ""} ${print && i === 1 ? "border-t" : ""}`}
              >
                <button
                  type="button"
                  disabled={print}
                  onClick={() => setOpen(i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-baseline gap-4 py-3.5 text-left short:py-2.5 md:py-4"
                >
                  <span
                    className={`w-6 shrink-0 text-[0.78rem] tabular-nums ${isOpen ? "text-sky" : "text-mist/50"}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`font-display flex-1 text-[1.25rem] leading-tight transition-colors short:text-[1.1rem] md:text-[1.7rem] ${
                      isOpen ? "text-paper" : "text-mist"
                    }`}
                  >
                    {item.name}
                  </span>
                  {!print && (
                    <span
                      className={`relative size-4 shrink-0 self-center transition-transform duration-500 ${isOpen ? "rotate-45" : ""}`}
                      aria-hidden
                    >
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
                      transition={{ duration: 0.55, ease }}
                      className="overflow-hidden"
                    >
                      <div className="pb-4 pl-10 short:pb-3 md:pb-6">
                        <p
                          className={`max-w-[46ch] text-mist leading-relaxed ${print ? "text-lg" : "text-[0.95rem] short:text-[0.86rem] short:leading-snug md:text-lg"}`}
                        >
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
        <>
          <span className="md:hidden">
            <Hint>{t.ui.tapHint}</Hint>
          </span>
          <span className="hidden md:inline">
            <Hint>{t.ui.clickHint}</Hint>
          </span>
        </>
      )}
      </Stage>
    </Chapter>
  );
}

// A three-cell strip that hints at the real screen without pretending to be it.
function Mock({ rows }: { rows: string[] }) {
  return (
    <div className="mt-3 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md border border-line bg-ink-2 px-2.5 py-2 text-[0.72rem] text-mist/90 md:text-[0.8rem]">
      {rows.map((r, i) => (
        <span key={r} className="flex items-center gap-1.5">
          {i > 0 && <span className="h-3 w-px bg-line-strong" />}
          <span
            className={
              i === 0 ? "text-paper" : i === rows.length - 1 ? "text-sky" : ""
            }
          >
            {r}
          </span>
        </span>
      ))}
    </div>
  );
}
