"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Body, Chapter, Foot, Hint, Kicker, Stage, Title, ease } from "../ui";

export function Sectors({ print }: { print?: boolean }) {
  const { t } = useT();
  const s = t.sectors;
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [pos, setPos] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const step = card.offsetWidth + 12;
      setPos(Math.round(el.scrollLeft / step));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (print) {
    return (
      <Chapter id="c6" index={5} print>
        <Kicker n={6} />
        <Title>{s.title}</Title>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {s.items.map((it) => (
            <div
              key={it.name}
              className="flex flex-col rounded-lg border border-line bg-ink-2 p-5"
            >
              <div className="font-display text-paper text-[1.35rem] leading-tight">{it.name}</div>
              <div className="mt-3 text-[0.66rem] uppercase tracking-[0.2em] text-mist/60">
                {s.lostLabel}
              </div>
              <p className="mt-1 text-mist text-[0.95rem] leading-snug">{it.lost}</p>
              <div className="mt-3 text-[0.66rem] uppercase tracking-[0.2em] text-sky/80">
                {s.changeLabel}
              </div>
              <p className="mt-1 text-paper text-[0.95rem] leading-snug">{it.change}</p>
            </div>
          ))}
        </div>
        <Foot>{s.footer}</Foot>
      </Chapter>
    );
  }

  const flip = (i: number) => setFlipped((f) => ({ ...f, [i]: !f[i] }));

  return (
    <Chapter id="c6" index={5}>
      <Kicker n={6} />
      <Title>{s.title}</Title>
      <Body className="mt-3 md:mt-4">{s.intro}</Body>

      <Stage className="-mx-6 md:mx-0">
        <div
          ref={railRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0"
        >
          {s.items.map((it, i) => {
            const on = !!flipped[i];
            return (
              <button
                key={it.name}
                type="button"
                onClick={() => flip(i)}
                aria-pressed={on}
                className={`relative flex h-[15rem] w-[78vw] max-w-[20rem] shrink-0 snap-center flex-col rounded-lg border p-4 text-left transition-colors duration-500 short:h-[12.5rem] md:h-[14rem] md:w-auto md:max-w-none md:p-5 ${
                  on
                    ? "border-sky/60 bg-sky/[0.06]"
                    : "border-line bg-ink-2 hover:border-line-strong"
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-display text-paper text-[1.15rem] leading-tight md:text-2xl">
                    {it.name}
                  </span>
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full transition-colors ${on ? "bg-sky shadow-[0_0_12px_rgba(143,208,250,0.7)]" : "bg-mist/30"}`}
                  />
                </span>
                <span
                  className={`mt-3 text-[0.66rem] uppercase tracking-[0.2em] ${on ? "text-sky/80" : "text-mist/50"}`}
                >
                  {on ? s.changeLabel : s.lostLabel}
                </span>
                <span className="relative mt-1 flex-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={on ? "c" : "l"}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35, ease }}
                      className={`block text-[0.9rem] leading-snug md:text-[0.98rem] ${on ? "text-paper" : "text-mist"}`}
                    >
                      {on ? it.change : it.lost}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-1.5 px-6 md:hidden">
          {s.items.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === pos ? "w-5 bg-sky" : "w-1.5 bg-mist/30"}`}
            />
          ))}
          <span className="ml-3 text-[0.66rem] uppercase tracking-[0.2em] text-mist/50">
            {t.ui.swipeCards}
          </span>
        </div>
        <div className="hidden md:block">
          <Hint>{t.ui.clickHint}</Hint>
        </div>
      </Stage>

      <Foot>{s.footer}</Foot>
    </Chapter>
  );
}
