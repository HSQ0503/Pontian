"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chapter, Hint, Kicker, Stage, Title, ease, rise } from "../ui";

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

  if (print) {
    return (
      <Chapter id="c7" index={6} print>
        <Kicker n={7} />
        <Title>{m.title}</Title>
        <div className="mt-8 grid grid-cols-[22rem_1fr] items-center gap-16">
          <Ring idx={n - 1} n={n} labels={m.steps.map((s) => s.name)} full />
          <ol className="grid grid-cols-2 gap-x-10 gap-y-6">
            {m.steps.map((s, i) => (
              <li key={s.name} className="border-t border-line pt-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-sky text-sm tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-paper text-2xl">
                    {s.name}
                  </span>
                </div>
                <p className="mt-1 text-mist leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <Facts facts={m.facts} />
      </Chapter>
    );
  }

  const step = m.steps[idx];

  return (
    <Chapter id="c7" index={6}>
      <Kicker n={7} />
      <Title>{m.title}</Title>

      <Stage>
        <div
          ref={ref}
          className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-14"
        >
          <Ring
            idx={idx}
            n={n}
            labels={m.steps.map((s) => s.name)}
            onPick={(i) => {
              setTouched(true);
              setIdx(i);
            }}
          />
          <div className="w-full min-h-[8rem] short:min-h-[7rem] md:min-h-[10rem] md:flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease }}
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-sky text-[0.78rem] tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-paper text-2xl md:text-4xl">
                    {step.name}
                  </span>
                </div>
                <p className="mt-2 max-w-[42ch] text-mist text-[0.95rem] leading-relaxed md:text-lg">
                  {step.body}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="hidden md:block">
              <Hint>{t.ui.clickHint}</Hint>
            </div>
          </div>
        </div>
      </Stage>

      <Facts facts={m.facts} />
    </Chapter>
  );
}

function Ring({
  idx,
  n,
  labels,
  onPick,
  full,
}: {
  idx: number;
  n: number;
  labels: string[];
  onPick?: (i: number) => void;
  full?: boolean;
}) {
  const progress = full ? 1 : idx / n;
  return (
    <div className="relative w-[13.5rem] shrink-0 short:w-[11.5rem] md:w-[17rem]">
      <svg viewBox="0 0 200 200" className="w-full overflow-visible">
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="rgba(143,208,250,0.18)"
          strokeWidth="1"
        />
        <motion.circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="#8fd0fa"
          strokeWidth="1.5"
          strokeLinecap="round"
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
            <g
              key={label}
              onClick={onPick ? () => onPick(i) : undefined}
              className={onPick ? "cursor-pointer" : ""}
            >
              <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
              <motion.circle
                cx={p.x}
                cy={p.y}
                animate={{
                  r: on ? 5 : 3.2,
                  fill: on || done ? "#8fd0fa" : "#0d1320",
                  stroke: on || done ? "#8fd0fa" : "rgba(143,208,250,0.45)",
                }}
                strokeWidth="1"
                transition={{ duration: 0.35 }}
              />
              {on && !full && (
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="none"
                  stroke="#8fd0fa"
                  strokeWidth="1"
                  initial={{ r: 5, opacity: 0.7 }}
                  animate={{ r: 16, opacity: 0 }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              )}
              <text
                x={lp.x}
                y={lp.y}
                textAnchor={
                  Math.abs(lp.x - 100) < 4
                    ? "middle"
                    : lp.x > 100
                      ? "start"
                      : "end"
                }
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

function Facts({ facts }: { facts: string[] }) {
  return (
    <motion.ul
      variants={rise}
      className="mt-auto grid grid-cols-1 gap-1.5 border-t border-line pt-4 text-[0.86rem] text-paper/85 short:text-[0.8rem] md:grid-cols-3 md:gap-6 md:pt-6 md:text-base"
    >
      {facts.map((f) => (
        <li key={f} className="flex items-start gap-2.5">
          <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-sky" />
          <span>{f}</span>
        </li>
      ))}
    </motion.ul>
  );
}
