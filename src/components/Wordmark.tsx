"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { wordmark } from "@/lib/wordmark";

type Props = {
  className?: string;
  href?: string;
  // Stagger the letters in, used on the homepage.
  animate?: boolean;
};

// The logo is the traced Shouqi Serif artwork, one path per letter, filled
// with currentColor. Height follows font-size so it sizes like text: the
// artwork's box is roughly the cap height plus the dot of the i.
export function Wordmark({ className = "text-2xl", href, animate }: Props) {
  const mark = (
    <svg
      viewBox={wordmark.viewBox}
      role="img"
      aria-label="Pontian"
      fill="currentColor"
      className={`inline-block w-auto select-none align-baseline text-sky ${className}`}
      style={{ height: "0.74em" }}
    >
      {wordmark.letters.map((d, i) =>
        animate ? (
          <motion.path
            key={i}
            d={d}
            fillRule="evenodd"
            initial={{ opacity: 0, y: 40, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : (
          <path key={i} d={d} fillRule="evenodd" />
        ),
      )}
    </svg>
  );
  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex" aria-label="Pontian">
      {mark}
    </Link>
  );
}
