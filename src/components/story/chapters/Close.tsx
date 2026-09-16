"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Download, MessageCircle, Phone } from "lucide-react";
import { useT } from "@/lib/i18n";
import { formatPhone, site, telUrl, whatsappUrl } from "@/lib/site";
import { Chapter, Lead, rise } from "../ui";

export function Close({ print }: { print?: boolean }) {
  const { t, locale } = useT();
  const c = t.close;
  const pdf = `/pontian-${locale}.pdf`;

  return (
    <Chapter index={15} print={print}>
      <div className="my-auto grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end md:gap-16">
        <div>
          <motion.h2 variants={rise} className="font-display text-sky text-[clamp(2.4rem,10vw,4rem)] leading-none md:text-[4.2rem]">
            {c.title}
          </motion.h2>
          <Lead className="md:text-[1.15rem]">{c.body}</Lead>
        </div>

        {print ? (
          <motion.dl variants={rise} className="grid gap-4 border-t border-line pt-4 text-[1.05rem]">
            <div>
              <dt className="label text-mist/60">{t.contactPage.phoneLabel}</dt>
              <dd className="mt-1 text-paper">{formatPhone()}</dd>
            </div>
            <div>
              <dt className="label text-mist/60">{t.contactPage.whatsappLabel}</dt>
              <dd className="mt-1 text-paper">{formatPhone()}</dd>
            </div>
            <div>
              <dt className="label text-mist/60">Web</dt>
              <dd className="mt-1 text-paper">{site.url.replace(/^https?:\/\//, "")}/story</dd>
            </div>
          </motion.dl>
        ) : (
          <motion.div variants={rise} className="grid border-t border-line">
            <Action href={telUrl()} icon={<Phone className="size-4" strokeWidth={1.6} />} value={formatPhone()}>
              {t.ui.call}
            </Action>
            <Action href={whatsappUrl(c.whatsappPrefill)} icon={<MessageCircle className="size-4" strokeWidth={1.6} />} external>
              {t.ui.whatsapp}
            </Action>
            <Action href={pdf} icon={<Download className="size-4" strokeWidth={1.6} />} download value={`pontian-${locale}.pdf`}>
              {t.ui.pdf}
            </Action>
          </motion.div>
        )}
      </div>
    </Chapter>
  );
}

function Action({
  href,
  icon,
  children,
  value,
  external,
  download,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  value?: string;
  external?: boolean;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      download={download ? true : undefined}
      className="group flex items-center justify-between gap-4 border-b border-line py-3.5 transition-colors hover:border-sky/60 md:py-4"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="text-sky">{icon}</span>
        <span className="flex min-w-0 flex-col">
          <span className="label text-paper">{children}</span>
          {value && <span className="truncate text-[0.8rem] text-mist/60">{value}</span>}
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-mist/50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sky" />
    </a>
  );
}
