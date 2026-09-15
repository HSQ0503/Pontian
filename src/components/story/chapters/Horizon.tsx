"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Hint, Kicker, Stage, Title, ease, rise } from "../ui";

export function Horizon({ print }: { print?: boolean }) {
  const { t } = useT();
  const h = t.horizon;

  if (print) {
    return (
      <Chapter id="c2" index={1} print>
        <Kicker n={2} />
        <Title>{h.title}</Title>
        <div className="mt-14 grid grid-cols-3 gap-10">
          {h.stops.map((s, i) => (
            <div
              key={s.name}
              className="flex flex-col gap-5 border-t border-line pt-6"
            >
              <EraGlyph era={i} />
              <div className="text-sky/80 text-sm tracking-[0.2em] uppercase">
                {s.year}
              </div>
              <div className="font-display text-paper text-3xl">{s.name}</div>
              <p className="text-mist text-lg leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-auto pt-10 text-paper text-xl">{h.closing}</p>
      </Chapter>
    );
  }

  return (
    <Chapter id="c2" index={1}>
      <Kicker n={2} />
      <Title>{h.title}</Title>
      <Stage>
        <Slider />
      </Stage>
      <motion.p
        variants={rise}
        className="mt-auto max-w-[40ch] border-t border-line pt-4 text-paper/90 text-[0.95rem] leading-relaxed short:text-[0.88rem] md:pt-6 md:text-lg"
      >
        {h.closing}
      </motion.p>
    </Chapter>
  );
}

function Slider() {
  const { t } = useT();
  const stops = t.horizon.stops;
  const [idx, setIdx] = useState(0);
  const [touched, setTouched] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const x = useMotionValue(0);
  const inView = useInView(trackRef, { amount: 0.6 });

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const go = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(stops.length - 1, i));
      setIdx(clamped);
      animate(x, (clamped / (stops.length - 1)) * w, {
        type: "spring",
        stiffness: 260,
        damping: 28,
      });
    },
    [stops.length, w, x],
  );

  // Walk through the eras on its own until someone touches it.
  useEffect(() => {
    if (!inView || touched || idx >= stops.length - 1) return;
    const id = window.setTimeout(() => go(idx + 1), 3400);
    return () => window.clearTimeout(id);
  }, [inView, touched, idx, stops.length, go]);

  useEffect(() => {
    x.set((idx / (stops.length - 1)) * w);
  }, [w, idx, stops.length, x]);

  return (
    <div>
      <div className="min-h-[13.5rem] short:min-h-[11.5rem] md:min-h-[13rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease }}
            className="flex flex-col gap-4 md:flex-row md:items-start md:gap-10"
          >
            <EraGlyph era={idx} />
            <div>
              <div className="text-sky/80 text-[0.72rem] uppercase tracking-[0.22em]">
                {stops[idx].year}
              </div>
              <div className="font-display mt-1 text-paper text-2xl md:text-4xl">
                {stops[idx].name}
              </div>
              <p className="mt-2 max-w-[40ch] text-mist text-[0.98rem] leading-relaxed md:text-lg">
                {stops[idx].body}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mt-4 select-none px-3 pb-8 pt-3 md:mt-6">
        <div ref={trackRef} className="relative h-px bg-line-strong">
          <motion.div
            className="absolute left-0 top-0 h-px origin-left bg-sky"
            style={{ width: x }}
          />
          {stops.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => {
                setTouched(true);
                go(i);
              }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-3"
              aria-label={s.name}
              style={{ left: `${(i / (stops.length - 1)) * 100}%` }}
            >
              <span
                className={`block size-2 rounded-full transition-colors ${i <= idx ? "bg-sky" : "bg-sky/25"}`}
              />
              <span
                className={`absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap text-[0.66rem] uppercase tracking-[0.18em] transition-colors ${
                  i === idx ? "text-sky" : "text-mist/50"
                } ${i === 0 ? "translate-x-0 left-3" : ""} ${i === stops.length - 1 ? "-translate-x-full left-[calc(100%-0.75rem)]" : ""}`}
              >
                {s.year}
              </span>
            </button>
          ))}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: w }}
            dragElastic={0.04}
            dragMomentum={false}
            onDragStart={() => setTouched(true)}
            onDrag={(_, info) => {
              const nx = Math.max(0, Math.min(w, x.get()));
              void info;
              const near = Math.round(
                (nx / Math.max(w, 1)) * (stops.length - 1),
              );
              if (near !== idx) setIdx(near);
            }}
            onDragEnd={() =>
              go(Math.round((x.get() / Math.max(w, 1)) * (stops.length - 1)))
            }
            style={{ x }}
            className="absolute top-1/2 -ml-4 -mt-4 grid size-8 cursor-grab place-items-center active:cursor-grabbing"
            aria-hidden
          >
            <span className="size-4 rounded-full bg-sky shadow-[0_0_0_6px_rgba(143,208,250,0.15),0_0_24px_rgba(143,208,250,0.5)]" />
          </motion.div>
        </div>
      </div>
      <Hint>{t.ui.dragHint}</Hint>
    </div>
  );
}

// Three small pictures, one per era. Drawn with boxes so they stay crisp at
// any size and never look like clip art.
function EraGlyph({ era }: { era: number }) {
  const base = "relative shrink-0 h-16 w-24 md:h-20 md:w-32";
  if (era === 0) {
    return (
      <div className={base} aria-hidden>
        <div className="absolute left-0 top-2 h-9 w-16 rounded-2xl rounded-bl-sm border border-sky/50 md:h-11 md:w-20" />
        <div className="absolute left-3 top-6 h-px w-8 bg-sky/50 md:left-4 md:top-7 md:w-10" />
        <div className="absolute left-3 top-8 h-px w-5 bg-sky/30 md:left-4 md:top-10 md:w-6" />
      </div>
    );
  }
  if (era === 1) {
    return (
      <div className={base} aria-hidden>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute top-2 h-12 w-7 rounded-md border border-sky/40 md:h-14 md:w-9"
            style={{ left: `${i * 32}px` }}
          >
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-sky" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={base} aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute top-1 h-6 w-7 rounded-sm border border-paper/30 md:h-7 md:w-9"
          style={{ left: `${i * 32}px` }}
        />
      ))}
      <div className="absolute left-0 top-9 h-5 w-[5.5rem] rounded-sm border border-sky bg-sky/10 shadow-[0_0_18px_rgba(143,208,250,0.35)] md:top-11 md:h-6 md:w-[7.2rem]" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute top-7 h-2 w-px bg-sky/60 md:top-8 md:h-3"
          style={{ left: `${i * 32 + 14}px` }}
        />
      ))}
    </div>
  );
}
