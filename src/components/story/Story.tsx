"use client";

import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LangToggle } from "@/components/LangToggle";
import { Adoption } from "./chapters/Adoption";
import { Close } from "./chapters/Close";
import { Commercial } from "./chapters/Commercial";
import { Controls } from "./chapters/Controls";
import { Cover } from "./chapters/Cover";
import { Flow } from "./chapters/Flow";
import { Horizon } from "./chapters/Horizon";
import { Layers } from "./chapters/Layers";
import { Leaders } from "./chapters/Leaders";
import { Method } from "./chapters/Method";
import { Roadmap } from "./chapters/Roadmap";
import { Scatter } from "./chapters/Scatter";
import { Sectors } from "./chapters/Sectors";
import { Shift } from "./chapters/Shift";
import { Summary } from "./chapters/Summary";
import { Team } from "./chapters/Team";
import { Frame, StepperContext, TOTAL } from "./ui";

export const chapters = [Cover, Summary, Horizon, Adoption, Leaders, Scatter, Layers, Flow, Shift, Sectors, Method, Roadmap, Controls, Commercial, Team, Close];

export function Story() {
  const scroller = useRef<HTMLDivElement>(null);
  const steppers = useRef(new Map<number, () => boolean>());
  const [active, setActive] = useState(0);
  const landed = useRef(false);

  // Whichever page covers most of the viewport is the active one.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>(".story-chapter"));
    const ratios = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        let best = 0;
        let bestIdx = -1;
        for (const s of sections) {
          const r = ratios.get(s) ?? 0;
          if (r > best) {
            best = r;
            bestIdx = Number(s.dataset.index);
          }
        }
        if (bestIdx >= 0) setActive(bestIdx);
      },
      { root, threshold: [0.25, 0.5, 0.75] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const goTo = useCallback((i: number) => {
    const root = scroller.current;
    const target = root?.querySelector<HTMLElement>(`.story-chapter[data-index="${Math.max(0, Math.min(TOTAL - 1, i))}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Right arrow advances a step inside the page when there is one, then moves on.
  const forward = useCallback(() => {
    const step = steppers.current.get(active);
    if (step && step()) return;
    goTo(active + 1);
  }, [active, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["ArrowRight", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        forward();
      } else if (["ArrowDown", "PageDown"].includes(e.key)) {
        e.preventDefault();
        goTo(active + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goTo(active - 1);
      } else if (e.key === "Home") goTo(0);
      else if (e.key === "End") goTo(TOTAL - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo, forward]);

  // Deep links like /story#5. Read once, before the hash writer runs.
  useEffect(() => {
    if (landed.current) return;
    landed.current = true;
    const m = window.location.hash.match(/^#(\d+)$/);
    const i = m ? Math.min(TOTAL - 1, Number(m[1]) - 1) : 0;
    if (i > 0) {
      const root = scroller.current;
      const target = root?.querySelector<HTMLElement>(`.story-chapter[data-index="${i}"]`);
      if (root && target) {
        root.style.scrollBehavior = "auto";
        root.scrollTop = target.offsetTop;
        root.style.scrollBehavior = "";
        setActive(i);
      }
    }
  }, []);

  useEffect(() => {
    if (!landed.current) return;
    const h = `#${active + 1}`;
    if (window.location.hash !== h) history.replaceState(null, "", h);
  }, [active]);

  return (
    <StepperContext.Provider value={steppers}>
      <div className="deck-root relative h-dvh overflow-hidden bg-ink">
        <Frame index={active} fixed hideMark={active === 0} extra={<LangToggle className="-mr-2" />} />

        {/* Progress hairline directly under the header, phones only. */}
        <div className="fixed inset-x-0 top-[calc(max(0.9rem,env(safe-area-inset-top))+2.4rem)] z-30 h-px bg-line md:hidden">
          <motion.div className="h-px bg-sky" animate={{ width: `${((active + 1) / TOTAL) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 24 }} />
        </div>

        {/* Desktop page controls. */}
        <div className="fixed bottom-14 right-14 z-40 hidden flex-col border border-line md:flex">
          <button type="button" aria-label="Previous" onClick={() => goTo(active - 1)} disabled={active === 0} className="grid size-9 place-items-center text-mist transition-colors hover:text-sky disabled:opacity-30">
            <ChevronUp className="size-4" />
          </button>
          <button type="button" aria-label="Next" onClick={forward} disabled={active === TOTAL - 1} className="grid size-9 place-items-center border-t border-line text-mist transition-colors hover:text-sky disabled:opacity-30">
            <ChevronDown className="size-4" />
          </button>
        </div>

        <div ref={scroller} className="story-scroll no-scrollbar relative z-10 h-dvh overflow-y-auto">
          {chapters.map((C, i) => (
            <C key={i} />
          ))}
        </div>
      </div>
    </StepperContext.Provider>
  );
}
