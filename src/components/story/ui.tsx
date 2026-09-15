"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const ease = [0.22, 1, 0.36, 1] as const;

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};

type ChapterProps = {
  id: string;
  index: number;
  children: ReactNode;
  print?: boolean;
  className?: string;
};

// A chapter is one viewport tall on screen and one 1920x1080 page in print.
// The reveal runs once, the first time the chapter scrolls into view.
export function Chapter({
  id,
  index,
  children,
  print,
  className = "",
}: ChapterProps) {
  const inner = (
    <motion.div
      className={`mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(0.9rem,env(safe-area-inset-top))+4rem)] short:pt-[calc(max(0.9rem,env(safe-area-inset-top))+3.4rem)] md:px-12 md:pt-24 ${className}`}
      variants={stagger}
      initial={print ? "show" : "hidden"}
      whileInView={print ? undefined : "show"}
      viewport={{ amount: 0.45, once: true }}
    >
      {children}
    </motion.div>
  );

  if (print) {
    return (
      <div
        className="print-page flex flex-col bg-ink text-paper"
        data-chapter={index + 1}
      >
        <PrintFrame index={index} />
        {inner}
      </div>
    );
  }

  return (
    <section
      id={id}
      data-index={index}
      className="story-chapter relative flex min-h-dvh snap-start flex-col"
      aria-label={`${index + 1}`}
    >
      {inner}
    </section>
  );
}

function PrintFrame({ index }: { index: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-12 pt-10">
      <span className="font-display text-sky text-2xl">Pontian</span>
      <span className="text-mist/60 text-sm tracking-[0.2em]">
        {String(index + 1).padStart(2, "0")} / 09
      </span>
    </div>
  );
}

export function Kicker({ n, children }: { n: number; children?: ReactNode }) {
  return (
    <motion.div
      variants={rise}
      className="mb-3 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.24em] text-sky/80 short:mb-2 md:mb-5"
    >
      <span>{String(n).padStart(2, "0")}</span>
      <span className="h-px w-8 bg-sky/40" />
      {children}
    </motion.div>
  );
}

export function Title({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.h2
      variants={rise}
      className={`font-display text-paper text-[clamp(1.9rem,7.2vw,3.6rem)] leading-[1.02] short:text-[clamp(1.7rem,6.4vw,3rem)] md:text-6xl ${className}`}
    >
      {children}
    </motion.h2>
  );
}

export function Body({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.p
      variants={rise}
      className={`mt-4 max-w-[38ch] text-mist text-[1.02rem] leading-relaxed short:mt-3 short:text-[0.94rem] short:leading-snug md:mt-6 md:text-xl ${className}`}
    >
      {children}
    </motion.p>
  );
}

// The interactive part of a chapter. Takes whatever room is left between the
// title block and the footer and centers itself in it.
export function Stage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={rise}
      className={`flex flex-1 flex-col justify-center py-4 short:py-2 md:py-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Foot({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.p
      variants={rise}
      className={`mt-auto pt-4 text-[0.86rem] leading-snug text-mist/70 short:text-[0.8rem] md:pt-6 md:text-base ${className}`}
    >
      {children}
    </motion.p>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <motion.span
      variants={rise}
      className="mt-3 inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em] text-sky/60"
    >
      <span className="size-1 rounded-full bg-sky/70" />
      {children}
    </motion.span>
  );
}
