"use client";

import { motion, type Variants } from "framer-motion";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/Wordmark";
import { pageSections } from "@/lib/content";
import { useT } from "@/lib/i18n";

export const ease = [0.22, 1, 0.36, 1] as const;

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export const TOTAL = pageSections.length;

// Pages with internal steps register a function that advances one step and
// returns false when there is nothing left to reveal. The deck's right-arrow
// and the tap-to-advance button call it before moving to the next page.
type StepperMap = React.RefObject<Map<number, () => boolean>>;
export const StepperContext = createContext<StepperMap | null>(null);

export function useStepper(index: number, total: number, print?: boolean) {
  // Starts at 1: the first item is always visible, so the first tap reveals the second.
  const [step, setStep] = useState(print ? total : 1);
  const map = useContext(StepperContext);
  const stepRef = useRef(step);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (!map?.current) return;
    const m = map.current;
    m.set(index, () => {
      if (stepRef.current >= total) return false;
      setStep((s) => Math.min(total, s + 1));
      return true;
    });
    return () => {
      m.delete(index);
    };
  }, [map, index, total]);

  const advance = () => setStep((s) => Math.min(total, s + 1));
  return { step, advance, done: step >= total };
}

type ChapterProps = {
  index: number;
  children: ReactNode;
  print?: boolean;
  className?: string;
  takeaway?: string;
  source?: string;
};

// One page of the deck: a viewport on screen, a 1920x1080 sheet in print. The
// frame (wordmark, tracker, page number, footer) is drawn once by Story on
// screen and per page in print, so the content area is identical in both.
export function Chapter({ index, children, print, className = "", takeaway, source }: ChapterProps) {
  const { t } = useT();
  const inner = (
    <motion.div
      className={`mx-auto flex w-full max-w-[72rem] flex-1 flex-col px-6 pb-[calc(2.6rem+env(safe-area-inset-bottom))] pt-[calc(4rem+env(safe-area-inset-top))] short:pt-[calc(3.8rem+env(safe-area-inset-top))] md:px-14 md:pb-14 md:pt-[5.5rem] ${className}`}
      variants={stagger}
      initial={print ? "show" : "hidden"}
      whileInView={print ? undefined : "show"}
      viewport={{ amount: 0.4, once: true }}
    >
      {children}
      {(takeaway || source) && (
        <motion.div variants={rise} className="mt-auto pt-5 short:pt-3 md:mt-0 md:pt-0">
          {takeaway && (
            <p className="max-w-[64ch] border-t border-line pt-3 text-paper text-[0.95rem] leading-snug short:pt-2 short:text-[0.84rem] md:pt-4 md:text-[1.05rem]">
              {takeaway}
            </p>
          )}
          {source && (
            <p className={`text-[0.72rem] leading-snug text-mist/60 short:text-[0.68rem] md:text-[0.78rem] ${takeaway ? "mt-2.5 short:mt-1.5 md:mt-3" : "border-t border-line pt-3"}`}>
              {t.ui.source}: {source}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );

  if (print) {
    return (
      <div className="print-page flex flex-col bg-ink text-paper" data-chapter={index + 1}>
        <Frame index={index} />
        {inner}
      </div>
    );
  }

  return (
    <section
      data-index={index}
      className="story-chapter relative flex min-h-dvh snap-start flex-col"
      aria-label={`${index + 1}`}
    >
      {inner}
    </section>
  );
}

// Slide chrome. Shared between the live deck (fixed) and print (per page).
export function Frame({ index, fixed, hideMark, extra }: { index: number; fixed?: boolean; hideMark?: boolean; extra?: ReactNode }) {
  const { t } = useT();
  const section = pageSections[index];
  const keys = Object.keys(t.ui.sections) as (keyof typeof t.ui.sections)[];
  const pos = fixed ? "fixed" : "absolute";
  return (
    <>
      <div
        className={`${pos} inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-[max(0.9rem,env(safe-area-inset-top))] md:px-14 md:pt-6`}
      >
        <span className={`inline-flex text-[1.15rem] transition-opacity duration-500 md:text-[1.35rem] ${hideMark ? "opacity-0" : "opacity-100"}`}>
          <Wordmark className="text-[1em]" />
        </span>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
          {keys.map((k) => (
            <span key={k} className={`label relative pb-1 transition-colors ${k === section ? "text-paper" : "text-mist/45"}`}>
              {t.ui.sections[k]}
              {k === section && <span className="absolute inset-x-0 -bottom-px h-px bg-sky" />}
            </span>
          ))}
        </nav>
        <span className="flex items-center gap-4 md:gap-6">
          <span className="label tabular text-mist/70">
            <span className="text-paper">{String(index + 1).padStart(2, "0")}</span>
            <span className="mx-1 text-mist/40">/</span>
            {String(TOTAL).padStart(2, "0")}
          </span>
          {extra}
        </span>
      </div>
      <div className={`${pos} inset-x-0 bottom-0 z-30 px-6 pb-[max(0.8rem,env(safe-area-inset-bottom))] md:px-14 md:pb-5`}>
        <div className="flex items-center justify-between border-t border-line pt-2.5 md:pt-3">
          <span className="label text-mist/60">
            <span className="md:hidden">{t.ui.sections[section]}</span>
            <span className="hidden md:inline">
              Pontian <span className="mx-1.5 text-mist/30">·</span> {t.ui.meta}
            </span>
          </span>
          <span className="label text-mist/60">{t.ui.docType}</span>
        </div>
      </div>
    </>
  );
}

// Action title: a full sentence that states the takeaway. Two lines at most.
export function Title({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.h2
      variants={rise}
      className={`font-display max-w-[34ch] text-paper text-[clamp(1.35rem,5.4vw,2rem)] leading-[1.14] short:text-[clamp(1.2rem,4.8vw,1.7rem)] md:text-[2.15rem] md:leading-[1.16] ${className}`}
    >
      {children}
    </motion.h2>
  );
}

export function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.p
      variants={rise}
      className={`mt-3 max-w-[60ch] text-mist text-[0.95rem] leading-relaxed short:text-[0.88rem] md:mt-4 md:text-[1.05rem] ${className}`}
    >
      {children}
    </motion.p>
  );
}

// The exhibit fills the space between the title and the takeaway. It carries
// a small numbered label and optional caption, the way a consulting page does.
export function Exhibit({
  n,
  caption,
  children,
  className = "",
}: {
  n: number;
  caption?: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useT();
  return (
    <motion.figure variants={rise} className={`mt-5 flex flex-col short:mt-3 md:my-auto md:py-6 ${className}`}>
      <figcaption className="label mb-3 flex flex-wrap items-baseline gap-x-3 text-mist/60 short:mb-2 md:mb-4">
        <span className="text-sky/80">
          {t.ui.exhibit} {n}
        </span>
        {caption && <span className="normal-case tracking-normal text-[0.78rem] text-mist/70">{caption}</span>}
      </figcaption>
      <div>{children}</div>
    </motion.figure>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <span className="label inline-flex items-center gap-2 text-sky/70">{children}</span>;
}

export function StepButton({ onClick, done, children }: { onClick: () => void; done: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done}
      className={`label mt-4 inline-flex items-center gap-2 border px-4 py-2 transition-colors ${
        done ? "border-line text-mist/40" : "border-sky/60 text-sky hover:bg-sky/10"
      }`}
    >
      {children}
      <span aria-hidden>→</span>
    </button>
  );
}
