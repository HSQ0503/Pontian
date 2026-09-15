"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Glow } from "@/components/Glow";
import { LangToggle } from "@/components/LangToggle";
import { Ripples } from "@/components/Ripples";
import { useT } from "@/lib/i18n";

const letters = "Pontian".split("");

export function Home() {
  const { t } = useT();

  return (
    <Ripples className="min-h-dvh">
      <Glow intensity={0.22} />
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <LangToggle />
      </header>

      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1
          className="font-display text-sky text-[clamp(3.4rem,14vw,9rem)] leading-none"
          aria-label="Pontian"
        >
          {letters.map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: 0.15 + i * 0.06,
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="mt-6 max-w-[22ch] text-mist text-[1.05rem] leading-snug md:mt-8 md:text-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {t.home.tagline}
        </motion.p>
      </main>

      <motion.footer
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
      >
        <Link
          href="/contact"
          className="group relative px-4 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-mist/70 transition-colors hover:text-sky"
        >
          {t.ui.contact}
          <span className="absolute inset-x-4 -bottom-0.5 h-px origin-left scale-x-0 bg-sky transition-transform duration-500 group-hover:scale-x-100" />
        </Link>
      </motion.footer>
    </Ripples>
  );
}
