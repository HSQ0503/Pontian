"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { useT } from "@/lib/i18n";
import { Chapter, ease, rise } from "../ui";

export function Cover({ print }: { print?: boolean }) {
  const { t } = useT();
  return (
    <Chapter index={0} print={print}>
      <div className="my-auto grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-16">
        <div>
          <motion.div variants={rise} className="text-[clamp(3.4rem,15vw,7.5rem)] leading-none md:text-[7.5rem]">
            <Wordmark className="text-[1em]" />
          </motion.div>
          <motion.h1
            variants={rise}
            className="font-display-light mt-6 max-w-[18ch] text-paper text-[clamp(1.5rem,6vw,2.6rem)] leading-[1.1] md:mt-9 md:text-[2.7rem]"
          >
            {t.cover.title}
          </motion.h1>
        </div>
        <motion.dl variants={rise} className="grid gap-4 border-t border-line pt-4 text-[0.92rem] md:pt-5 md:text-[1rem]">
          <div>
            <dt className="label text-mist/60">{t.ui.docType}</dt>
            <dd className="mt-1 text-paper">{t.cover.sub}</dd>
          </div>
          <div>
            <dt className="label text-mist/60">{t.ui.meta}</dt>
            <dd className="mt-1 text-paper">
              {t.ui.cities.orlando} <span className="text-mist/40">·</span> {t.ui.cities.saoPaulo}
            </dd>
          </div>
        </motion.dl>
      </div>

      {!print && (
        <motion.div variants={rise} className="label flex items-center gap-3 pt-6 text-sky/70">
          <motion.span
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease }}
            className="grid size-7 place-items-center border border-sky/30"
          >
            <ChevronDown className="size-3.5" />
          </motion.span>
          <span className="md:hidden">{t.ui.swipe}</span>
          <span className="hidden md:inline">{t.ui.scroll}</span>
        </motion.div>
      )}
    </Chapter>
  );
}
