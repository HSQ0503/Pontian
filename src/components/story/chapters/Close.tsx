"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Download, Mail, MessageCircle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { mailtoUrl, site, whatsappUrl } from "@/lib/site";
import { Body, Chapter, Kicker, Stage, Title, rise } from "../ui";

export function Close({ print }: { print?: boolean }) {
  const { t, locale } = useT();
  const c = t.close;
  const pdf = `/pontian-${locale}.pdf`;

  return (
    <Chapter id="c9" index={8} print={print}>
      <Kicker n={9} />
      <Title className="text-sky">{c.title}</Title>
      <Body>{c.body}</Body>

      {print ? (
        <div className="mt-14 grid grid-cols-2 gap-12 border-t border-line pt-8 text-2xl">
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.22em] text-mist/60">
              {t.contactPage.emailLabel}
            </div>
            <div className="mt-2 text-paper">{site.email}</div>
          </div>
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.22em] text-mist/60">
              {t.contactPage.whatsappLabel}
            </div>
            <div className="mt-2 text-paper">+{site.whatsapp}</div>
          </div>
          <div className="col-span-2 text-mist text-lg">
            {site.url.replace(/^https?:\/\//, "")}/story
          </div>
        </div>
      ) : (
        <Stage>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <Action
              href={mailtoUrl(c.emailSubject)}
              icon={<Mail className="size-4" strokeWidth={1.6} />}
              primary
            >
              {t.ui.email}
            </Action>
            <Action
              href={whatsappUrl(c.whatsappPrefill)}
              icon={<MessageCircle className="size-4" strokeWidth={1.6} />}
              external
            >
              {t.ui.whatsapp}
            </Action>
            <Action
              href={pdf}
              icon={<Download className="size-4" strokeWidth={1.6} />}
              download
            >
              {t.ui.pdf}
            </Action>
          </div>
        </Stage>
      )}

      <motion.div
        variants={rise}
        className="mt-auto flex items-end justify-between pt-12"
      >
        <span className="font-display text-sky text-3xl md:text-4xl">
          Pontian
        </span>
        {!print && (
          <span className="text-[0.68rem] uppercase tracking-[0.22em] text-mist/50">
            Orlando · São Paulo
          </span>
        )}
      </motion.div>
    </Chapter>
  );
}

function Action({
  href,
  icon,
  children,
  primary,
  external,
  download,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  primary?: boolean;
  external?: boolean;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      download={download ? true : undefined}
      className={`group flex items-center justify-between gap-4 rounded-full border px-5 py-3.5 text-[0.78rem] uppercase tracking-[0.18em] transition-all active:scale-[0.98] md:px-6 ${
        primary
          ? "border-sky bg-sky text-ink hover:bg-sky/90"
          : "border-line-strong text-paper hover:border-sky/70 hover:text-sky"
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {children}
      </span>
      <ArrowUpRight className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
