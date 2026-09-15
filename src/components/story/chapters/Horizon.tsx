"use client";

import { AnimatePresence, animate, motion, useInView, useMotionValue } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Hint, Title, ease } from "../ui";

export function Horizon({ print }: { print?: boolean }) {
  const { t } = useT();
  const h = t.horizon;

  return (
    <Chapter index={2} print={print} takeaway={h.takeaway} source={h.source}>
      <Title>{h.title}</Title>
      <Exhibit n={2}>
        {print ? (
          <div className="grid grid-cols-3 gap-10 border-t border-line pt-6">
            {h.stops.map((s, i) => (
              <div key={s.name} className="flex flex-col gap-4">
                <EraGlyph era={i} />
                <div className="label text-sky/80">{s.year}</div>
                <div className="font-display text-paper text-[1.6rem]">{s.name}</div>
                <p className="text-mist leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <Slider />
        )}
      </Exhibit>
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
  const last = stops.length - 1;

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
      const c = Math.max(0, Math.min(last, i));
      setIdx(c);
      animate(x, (c / last) * w, { type: "spring", stiffness: 260, damping: 30 });
    },
    [last, w, x],
  );

  useEffect(() => {
    if (!inView || touched || idx >= last) return;
    const id = window.setTimeout(() => go(idx + 1), 3400);
    return () => window.clearTimeout(id);
  }, [inView, touched, idx, last, go]);

  useEffect(() => {
    x.set((idx / last) * w);
  }, [w, idx, last, x]);

  return (
    <div>
      <div className="min-h-[11.5rem] short:min-h-[10rem] md:min-h-[9.5rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease }}
            className="grid gap-4 md:grid-cols-[9rem_1fr] md:items-start md:gap-10"
          >
            <EraGlyph era={idx} />
            <div>
              <div className="flex items-baseline gap-3">
                <span className="label tabular text-sky/80">{stops[idx].year}</span>
                <span className="font-display text-paper text-[1.4rem] md:text-[1.7rem]">{stops[idx].name}</span>
              </div>
              <p className="mt-2 max-w-[54ch] text-mist text-[0.95rem] leading-relaxed short:text-[0.88rem] md:text-[1.02rem]">
                {stops[idx].body}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mt-3 select-none px-2 pb-7 pt-3 md:mt-4">
        <div ref={trackRef} className="relative h-px bg-line-strong">
          <motion.div className="absolute left-0 top-0 h-px origin-left bg-sky" style={{ width: x }} />
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
              style={{ left: `${(i / last) * 100}%` }}
            >
              <span className={`block size-1.5 ${i <= idx ? "bg-sky" : "bg-sky/30"}`} />
              <span
                className={`label tabular absolute top-full whitespace-nowrap transition-colors ${i === idx ? "text-sky" : "text-mist/50"} ${
                  i === 0 ? "left-2" : i === last ? "right-2" : "left-1/2 -translate-x-1/2"
                }`}
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
            onDrag={() => {
              const near = Math.round((Math.max(0, Math.min(w, x.get())) / Math.max(w, 1)) * last);
              if (near !== idx) setIdx(near);
            }}
            onDragEnd={() => go(Math.round((x.get() / Math.max(w, 1)) * last))}
            style={{ x }}
            className="absolute top-1/2 -ml-4 -mt-4 grid size-8 cursor-grab place-items-center active:cursor-grabbing"
            aria-hidden
          >
            <span className="size-3 border border-sky bg-ink" />
          </motion.div>
        </div>
      </div>
      <Hint>{t.ui.dragHint}</Hint>
    </div>
  );
}

// Three small line drawings, one per era. Boxes and rules only.
function EraGlyph({ era }: { era: number }) {
  const base = "relative h-14 w-28 shrink-0";
  if (era === 0) {
    return (
      <div className={base} aria-hidden>
        <div className="absolute left-0 top-1 h-9 w-16 border border-mist/50" />
        <div className="absolute left-3 top-4 h-px w-9 bg-mist/60" />
        <div className="absolute left-3 top-6 h-px w-6 bg-mist/40" />
      </div>
    );
  }
  if (era === 1) {
    return (
      <div className={base} aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="absolute top-1 h-11 w-7 border border-mist/50" style={{ left: `${i * 34}px` }}>
            <span className="absolute right-1 top-1 size-1.5 bg-sky" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={base} aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute top-0 h-5 w-7 border border-mist/40" style={{ left: `${i * 34}px` }} />
      ))}
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute top-5 h-3 w-px bg-sky/70" style={{ left: `${i * 34 + 13}px` }} />
      ))}
      <div className="absolute left-0 top-8 h-5 w-[6rem] border border-sky bg-sky/10" />
    </div>
  );
}
