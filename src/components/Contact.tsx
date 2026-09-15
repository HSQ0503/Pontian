"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { LangToggle } from "@/components/LangToggle";
import { Wordmark } from "@/components/Wordmark";
import { useT } from "@/lib/i18n";
import { mailtoUrl, site, whatsappUrl } from "@/lib/site";

const ease = [0.22, 1, 0.36, 1] as const;

export function Contact() {
  const { t } = useT();
  const c = t.contactPage;

  return (
    <div className="relative min-h-dvh">
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <Wordmark href="/" className="text-xl" />
        <LangToggle />
      </header>

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 pb-24 pt-24">
        <motion.h1
          className="font-display text-sky text-[clamp(2.6rem,10vw,4.5rem)] leading-none"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
        >
          {c.title}
        </motion.h1>
        <motion.p
          className="mt-4 text-mist text-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8, ease }}
        >
          {c.body}
        </motion.p>

        <motion.ul
          className="mt-10 border-t border-line"
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
          }}
        >
          <Row
            href={mailtoUrl(c.emailSubject)}
            icon={<Mail className="size-5" strokeWidth={1.5} />}
            label={c.emailLabel}
            value={site.email}
          />
          <Row
            href={whatsappUrl(c.whatsappPrefill)}
            icon={<MessageCircle className="size-5" strokeWidth={1.5} />}
            label={c.whatsappLabel}
            value={formatPhone(site.whatsapp)}
            external
          />
        </motion.ul>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-mist/70 transition-colors hover:text-sky"
        >
          <ArrowLeft className="size-3.5" />
          {t.ui.back}
        </Link>
      </footer>
    </div>
  );
}

function Row({
  href,
  icon,
  label,
  value,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  external?: boolean;
}) {
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
      }}
    >
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="group flex items-center gap-4 border-b border-line py-5 transition-colors hover:border-sky/60"
      >
        <span className="grid size-11 shrink-0 place-items-center border border-line text-sky transition-colors group-hover:border-sky/60">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.7rem] uppercase tracking-[0.2em] text-mist/70">
            {label}
          </span>
          <span className="truncate text-paper text-lg">{value}</span>
        </span>
        <ArrowUpRight className="size-5 text-mist/50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sky" />
      </a>
    </motion.li>
  );
}

function formatPhone(digits: string) {
  // +1 407 555 0100 or +55 11 99999 9999. Good enough for display.
  if (digits.startsWith("55") && digits.length === 13)
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`;
  if (digits.startsWith("1") && digits.length === 11)
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}
