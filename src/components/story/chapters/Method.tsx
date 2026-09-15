"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Exhibit, Hint, Title, ease } from "../ui";

const R = 78;
const C = 2 * Math.PI * R;
const pt = (i: number, n: number, r = R) => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r };
};

export function Method({ print }: { print?: boolean }) {
  const { t } = useT();
  const m = t.method;
  const n = m.steps.length;
  const [idx, setIdx] = useState(0);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6 });

  useEffect(() => {
    if (print || !inView || touched) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % n), 3000);
    return () => window.clearInterval(id);
  }, [inView, touched, n, print]);

  const labels = m.steps.map((s) => s.name);

  return (
    <Chapter index={10} print={print}>
      <Title>{m.title}</Title>
      <Exhibit n={10}>
        {print ? (
          <div className="grid grid-cols-[19rem_1fr] items-center gap-14">
            <Ring idx={n - 1} n={n} labels={labels} full />
            <ol className="grid grid-cols-2 gap-x-10 gap-y-4">
              {m.steps.map((s, i) => (
                <li key={s.name} className="border-t border-line pt-3">
                  <div className="flex items-baseline gap-3">
                    <span className="tabular text-sky text-[0.8rem]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-display text-paper text-[1.2rem]">{s.name}</span>
                  </div>
                  <p className="mt-1 text-[0.95rem] leading-snug text-mist">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div ref={ref} className="grid items-center gap-3 md:grid-cols-[16rem_1fr] md:gap-12">
            <Ring
              idx={idx}
              n={n}
              labels={labels}
              onPick={(i) => {
                setTouched(true);
                setIdx(i);
              }}
            />
            <div className="min-h-[7.5rem] short:min-h-[6.5rem] md:min-h-[9rem]">
              <AnimatePresence mode="wait">
                <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease }}>
                  <div className="flex items-baseline gap-3">
                    <span className="tabular text-sky text-[0.78rem]">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="font-display text-paper text-[1.4rem] md:text-[1.8rem]">{m.steps[idx].name}</span>
                  </div>
                  <p className="mt-2 max-w-[46ch] text-[0.92rem] leading-relaxed text-mist short:text-[0.85rem] md:text-[1.05rem]">{m.steps[idx].body}</p>
                </motion.div>
              </AnimatePresence>
              <div className="mt-3 hidden md:block">
                <Hint>{t.ui.clickHint}</Hint>
              </div>
            </div>
          </div>
        )}
      </Exhibit>
      <motion.ul className="mt-4 grid grid-cols-1 gap-1.5 border-t border-line pt-3 text-[0.86rem] text-paper/85 short:text-[0.8rem] md:mt-6 md:grid-cols-3 md:gap-6 md:pt-4 md:text-[0.95rem]">
        {m.facts.map((f, i) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="tabular text-sky/80">{String(i + 1).padStart(2, "0")}</span>
            <span>{f}</span>
          </li>
        ))}
      </motion.ul>
    </Chapter>
  );
}

function Ring({ idx, n, labels, onPick, full }: { idx: number; n: number; labels: string[]; onPick?: (i: number) => void; full?: boolean }) {
  const progress = full ? 1 : idx / n;
  return (
    <div className="relative mx-auto w-[12.5rem] shrink-0 short:w-[10.5rem] md:w-[16rem]">
      <svg viewBox="0 0 200 200" className="w-full overflow-visible">
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(143,208,250,0.18)" strokeWidth="1" />
        <motion.circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="#8fd0fa"
          strokeWidth="1.5"
          strokeDasharray={C}
          animate={{ strokeDashoffset: C * (1 - progress) }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          transform="rotate(-90 100 100)"
        />
        {labels.map((label, i) => {
          const p = pt(i, n);
          const lp = pt(i, n, R + 22);
          const on = full || i === idx;
          const done = full || i < idx;
          return (
            <g key={label} onClick={onPick ? () => onPick(i) : undefined} className={onPick ? "cursor-pointer" : ""}>
              <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
              {on && !full && <rect x={p.x - 7} y={p.y - 7} width="14" height="14" fill="none" stroke="#8fd0fa" strokeWidth="1" opacity="0.6" />}
              <motion.rect
                x={p.x - 4}
                y={p.y - 4}
                width="8"
                height="8"
                initial={false}
                animate={{ fill: on || done ? "#8fd0fa" : "#010206", stroke: on || done ? "#8fd0fa" : "rgba(143,208,250,0.45)" }}
                strokeWidth="1"
                transition={{ duration: 0.3 }}
              />
              <text
                x={lp.x}
                y={lp.y}
                textAnchor={Math.abs(lp.x - 100) < 4 ? "middle" : lp.x > 100 ? "start" : "end"}
                dominantBaseline="middle"
                className="font-display"
                fontSize="9.5"
                fill={on ? "#e9f1f8" : done ? "#8fd0fa" : "#96a9bc"}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
