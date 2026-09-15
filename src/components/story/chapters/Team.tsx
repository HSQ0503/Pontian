"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Body, Chapter, Foot, Hint, Kicker, Stage, Title, ease } from "../ui";

const initials = (name: string) =>
  name
    .split(" ")
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .map((w) => w[0])
    .join("");

export function Team({ print }: { print?: boolean }) {
  const { t } = useT();
  const tm = t.team;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Chapter id="c8" index={7} print={print}>
      <Kicker n={8} />
      <Title>{tm.title}</Title>
      <Body className="mt-3 md:mt-4">{tm.intro}</Body>

      <Stage>
        <ul
          className={`${print ? "grid grid-cols-5 gap-6" : "divide-y divide-line border-y border-line md:grid md:grid-cols-5 md:gap-4 md:divide-y-0 md:border-0"}`}
        >
          {tm.people.map((p, i) => {
            const on = print || open === i;
            return (
              <li
                key={p.name}
                className={
                  print
                    ? "rounded-lg border border-line bg-ink-2 p-5"
                    : "md:rounded-lg md:border md:border-line md:bg-ink-2 md:p-4"
                }
              >
                <button
                  type="button"
                  disabled={print}
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={on}
                  className="flex w-full items-center gap-3.5 py-3 text-left short:py-2 md:flex-col md:items-start md:gap-3 md:py-0"
                >
                  <span
                    className={`font-display grid size-11 shrink-0 place-items-center rounded-full border text-[0.95rem] transition-colors md:size-12 ${
                      on
                        ? "border-sky text-sky"
                        : "border-line-strong text-mist"
                    }`}
                  >
                    {initials(p.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-display text-paper text-[1.05rem] leading-tight md:text-lg">
                      {p.name}
                    </span>
                    <span className="mt-0.5 text-[0.78rem] leading-snug text-mist md:text-[0.82rem]">
                      {p.role}
                    </span>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {(on || print) && (
                    <motion.p
                      key="line"
                      initial={print ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease }}
                      className={`overflow-hidden text-[0.88rem] leading-snug text-mist/90 ${print ? "mt-3" : "pb-3 pl-[3.6rem] md:pl-0 md:pt-2"}`}
                    >
                      {p.line}
                    </motion.p>
                  )}
                </AnimatePresence>
                {!print && !on && (
                  <span className="hidden md:block md:pt-2 md:text-[0.88rem] md:leading-snug md:text-transparent">
                    {p.line}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {!print && (
          <div className="md:hidden">
            <Hint>{t.ui.tapHint}</Hint>
          </div>
        )}
      </Stage>
      <Foot>{tm.footer}</Foot>
    </Chapter>
  );
}
