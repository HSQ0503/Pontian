"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Glow } from "@/components/Glow";
import { LangToggle } from "@/components/LangToggle";
import { Wordmark } from "@/components/Wordmark";
import { useT } from "@/lib/i18n";
import { Close } from "./chapters/Close";
import { Cover } from "./chapters/Cover";
import { Horizon } from "./chapters/Horizon";
import { Layers } from "./chapters/Layers";
import { Method } from "./chapters/Method";
import { Scatter } from "./chapters/Scatter";
import { Sectors } from "./chapters/Sectors";
import { Shift } from "./chapters/Shift";
import { Team } from "./chapters/Team";

export const chapters = [
  Cover,
  Horizon,
  Scatter,
  Layers,
  Shift,
  Sectors,
  Method,
  Team,
  Close,
];

export function Story() {
  const { t } = useT();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const total = chapters.length;

  // The scroll container owns the snap. Whichever chapter covers most of the
  // viewport is the active one.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>(".story-chapter"),
    );
    const ratios = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        let best = 0;
        let bestIdx = active;
        for (const s of sections) {
          const r = ratios.get(s) ?? 0;
          if (r > best) {
            best = r;
            bestIdx = Number(s.dataset.index);
          }
        }
        setActive(bestIdx);
      },
      { root, threshold: [0.25, 0.5, 0.75] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const root = scroller.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(
        `.story-chapter[data-index="${Math.max(0, Math.min(total - 1, i))}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        goTo(active + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goTo(active - 1);
      } else if (e.key === "Home") goTo(0);
      else if (e.key === "End") goTo(total - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo, total]);

  // Deep links like /story#5 land on the right chapter. Read once, before the
  // hash writer below gets a chance to overwrite it.
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current) return;
    landed.current = true;
    const m = window.location.hash.match(/^#(\d+)$/);
    const i = m ? Number(m[1]) - 1 : 0;
    if (i > 0) {
      const root = scroller.current;
      const target = root?.querySelector<HTMLElement>(
        `.story-chapter[data-index="${Math.min(total - 1, i)}"]`,
      );
      if (root && target) {
        root.style.scrollBehavior = "auto";
        root.scrollTop = target.offsetTop;
        root.style.scrollBehavior = "";
        setActive(Math.min(total - 1, i));
      }
    }
  }, [total]);

  useEffect(() => {
    if (!landed.current) return;
    const h = `#${active + 1}`;
    if (window.location.hash !== h) history.replaceState(null, "", h);
  }, [active]);

  return (
    <div className="relative h-dvh overflow-hidden bg-ink">
      <Glow intensity={0.14} />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-[max(0.9rem,env(safe-area-inset-top))] md:px-8">
        <motion.div
          className="pointer-events-auto"
          animate={{ opacity: active === 0 ? 0 : 1 }}
          transition={{ duration: 0.5 }}
          style={{ pointerEvents: active === 0 ? "none" : "auto" }}
        >
          <Wordmark href="/" className="text-xl md:text-2xl" />
        </motion.div>
        <div className="pointer-events-auto flex items-center gap-4">
          <span className="text-[0.7rem] tabular-nums tracking-[0.2em] text-mist/70">
            <span className="text-sky">
              {String(active + 1).padStart(2, "0")}
            </span>{" "}
            / {String(total).padStart(2, "0")}
          </span>
          <LangToggle />
        </div>
      </header>

      {/* Mobile: hairline progress under the header. */}
      <div className="fixed inset-x-0 top-[calc(max(0.9rem,env(safe-area-inset-top))+2.6rem)] z-30 h-px bg-line md:hidden">
        <motion.div
          className="h-px bg-sky"
          animate={{ width: `${((active + 1) / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>

      {/* Desktop: dot rail. */}
      <nav
        aria-label={t.ui.chapter}
        className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex"
      >
        {chapters.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${t.ui.chapter} ${i + 1}`}
            aria-current={i === active}
            onClick={() => goTo(i)}
            className="group relative grid size-5 place-items-center"
          >
            <span
              className={`block rounded-full transition-all duration-500 ${
                i === active
                  ? "size-2 bg-sky shadow-[0_0_10px_rgba(143,208,250,0.8)]"
                  : "size-1.5 bg-mist/30 group-hover:bg-mist/70"
              }`}
            />
          </button>
        ))}
      </nav>

      <div
        ref={scroller}
        className="story-scroll no-scrollbar relative z-10 h-dvh overflow-y-auto"
      >
        {chapters.map((C, i) => (
          <C key={i} />
        ))}
      </div>
    </div>
  );
}
