"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LangToggle } from "@/components/LangToggle";
import { Ripples } from "@/components/Ripples";
import { Wordmark } from "@/components/Wordmark";
import { useT } from "@/lib/i18n";

export function Home() {
  const { t } = useT();

  return (
    <Ripples className="min-h-dvh">
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] md:px-10 md:pt-8">
        <Clock city={t.ui.cities.orlando} zone="America/New_York" />
        <LangToggle />
      </header>

      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[clamp(3.4rem,14vw,9rem)] leading-none">
          <Wordmark animate className="text-[1em]" />
        </h1>

        <motion.p
          className="mt-6 max-w-[24ch] text-mist text-[1.05rem] leading-snug md:mt-8 md:text-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {t.home.tagline}
        </motion.p>
      </main>

      <motion.footer
        className="fixed inset-x-0 bottom-0 z-20 flex items-end justify-between px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-10 md:pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
      >
        <Clock city={t.ui.cities.saoPaulo} zone="America/Sao_Paulo" />
        <Link href="/contact" className="group label relative py-2 text-mist/70 transition-colors hover:text-sky">
          {t.ui.contact}
          <span className="absolute inset-x-0 bottom-0.5 h-px origin-left scale-x-0 bg-sky transition-transform duration-500 group-hover:scale-x-100" />
        </Link>
      </motion.footer>
    </Ripples>
  );
}

// Live local time in one of the two cities the company works from.
function Clock({ city, zone }: { city: string; zone: string }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: zone });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [zone]);
  return (
    <span className="label tabular text-mist/60">
      {city} <span className="ml-1.5 text-paper/80">{time}</span>
    </span>
  );
}
