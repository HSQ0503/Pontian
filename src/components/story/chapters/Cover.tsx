"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Chapter, ease, rise } from "../ui";

export function Cover({ print }: { print?: boolean }) {
  const { t } = useT();
  return (
    <Chapter id="c1" index={0} print={print}>
      <div className="my-auto">
        <motion.div
          variants={rise}
          className="font-display text-sky text-[clamp(3.6rem,15vw,10rem)] leading-none"
        >
          Pontian
        </motion.div>
        <motion.h1
          variants={rise}
          className="font-display-light mt-6 max-w-[16ch] text-paper text-[clamp(1.6rem,6.4vw,3.4rem)] leading-[1.06] md:mt-10 md:text-5xl"
        >
          {t.cover.title}
        </motion.h1>
        <motion.p
          variants={rise}
          className="mt-4 max-w-[36ch] text-mist text-base leading-relaxed md:mt-6 md:text-xl"
        >
          {t.cover.sub}
        </motion.p>
      </div>

      {!print && (
        <motion.div
          variants={rise}
          className="flex items-center gap-3 pt-10 text-[0.7rem] uppercase tracking-[0.22em] text-sky/70"
        >
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease }}
            className="grid size-8 place-items-center rounded-full border border-sky/30"
          >
            <ChevronDown className="size-4" />
          </motion.span>
          <span className="md:hidden">{t.ui.swipe}</span>
          <span className="hidden md:inline">{t.ui.scroll}</span>
        </motion.div>
      )}
    </Chapter>
  );
}
