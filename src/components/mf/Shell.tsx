"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Box,
  Brain,
  Building,
  CalendarRange,
  LifeBuoy,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { useCopy } from "@/lib/mf/copy";
import { arCode } from "@/lib/mf/format";
import { useMf } from "@/lib/mf/store";
import { cx } from "./ui";

type NavItem = { href: string; label: string; icon: LucideIcon; preview?: boolean; exact?: boolean };

function useNav() {
  const { c, lang } = useCopy();
  const groups: { label: string; muted?: boolean; items: NavItem[] }[] = [
    {
      label: "",
      items: [
        { href: "/mf", label: c.nav.dashboard, icon: LayoutDashboard, exact: true },
        { href: "/mf/atas", label: c.nav.atas, icon: FileText },
        { href: "/mf/registro", label: c.nav.registry, icon: BookOpen },
        { href: "/mf/projetos", label: c.nav.projects, icon: Building },
      ],
    },
    {
      label: lang === "pt" ? "Em breve" : "Coming soon",
      muted: true,
      items: [
        { href: "/mf/brain", label: c.nav.brain, icon: Brain, preview: true },
        { href: "/mf/documentos", label: c.nav.documents, icon: FolderOpen, preview: true },
        { href: "/mf/prazos", label: c.nav.schedule, icon: CalendarRange, preview: true },
        { href: "/mf/revit", label: c.nav.revit, icon: Box, preview: true },
      ],
    },
    { label: " ", items: [{ href: "/mf/ajuda", label: lang === "pt" ? "Como usar" : "How to use", icon: LifeBuoy }] },
  ];
  return groups;
}

function Logo() {
  const { c } = useCopy();
  return (
    <Link href="/mf" className="flex items-center gap-3.5">
      <Image src="/mf/mf-logo-black.png" alt="Minerbo-Fuchs" width={206} height={105} priority className="h-[34px] w-auto invert" />
      <span className="h-8 w-px bg-mf-400" />
      <span className="flex flex-col leading-none">
        <span className="mf-brand text-[13px] font-bold text-white">{c.brand.toUpperCase()}</span>
        <span className="mf-brand mt-1.5 text-[9.5px] font-medium uppercase text-mf-600">Engenharia</span>
      </span>
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = useNav();
  const { c, lang, setLocale } = useCopy();
  const { meetings } = useMf();
  const processing = meetings.filter((m) => m.status === "processing");

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-6">
        <Logo />
      </div>
      <div className="px-4">
        <Link
          href="/mf/atas/nova"
          onClick={onNavigate}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-[2px] bg-white text-[13px] font-semibold text-black transition-colors hover:bg-mf-900"
        >
          <Plus className="size-4" />
          {c.newAta}
        </Link>
      </div>

      <nav className="mf-scroll mt-5 flex-1 overflow-y-auto px-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            {group.label.trim() && <div className="mb-1.5 px-3 text-[11.5px] font-medium text-mf-600">{group.label}</div>}
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cx(
                    "group relative flex h-8 items-center gap-2.5 rounded-[2px] px-3 text-[13px] font-medium transition-colors",
                    active ? "bg-mf-200 text-white" : item.preview ? "text-mf-600 hover:bg-mf-150 hover:text-mf-900" : "text-mf-800 hover:bg-mf-150 hover:text-white",
                  )}
                >
                  <item.icon className={cx("size-4", active ? "text-white" : "text-mf-600 group-hover:text-mf-900")} strokeWidth={1.75} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {processing.length > 0 && (
          <div className="mb-5 rounded-none border border-mf-400 bg-mf-150 p-3">
            {processing.map((meeting) => (
              <Link key={meeting.id} href={`/mf/atas/${meeting.id}`} onClick={onNavigate} className="flex items-center gap-2.5 py-1 text-[12px] text-mf-800 hover:text-white">
                <LoaderCircle className="size-3.5 animate-spin" />
                <span className="mf-num text-[11px]">{arCode(meeting.ar)}</span>
                <span className="truncate">{c.meetingStatus.processing}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="flex items-center gap-3 border-t border-mf-300 px-5 py-3.5">
        <span className="flex size-7 items-center justify-center bg-mf-200 text-[10.5px] font-semibold text-white">MF</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-mf-900">{c.user}</span>
          <span className="block text-[11px] text-mf-600">{c.builtBy}</span>
        </span>
        <span className="flex text-[11.5px] font-medium">
          {(["pt", "en"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              aria-pressed={lang === value}
              className={cx("px-1.5 py-1 uppercase transition-colors", lang === value ? "text-white" : "text-mf-600 hover:text-mf-900")}
            >
              {value}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}

function SystemBar() {
  const pathname = usePathname();
  const { c, lang } = useCopy();
  const { meetings } = useMf();
  const labels: Record<string, string> = {
    atas: c.nav.atas,
    nova: c.newAta,
    registro: c.nav.registry,
    projetos: c.nav.projects,
    brain: c.nav.brain,
    documentos: c.nav.documents,
    prazos: c.nav.schedule,
    revit: c.nav.revit,
    ajuda: lang === "pt" ? "Como usar" : "How to use",
  };
  const parts = pathname.split("/").filter(Boolean).slice(1);
  const crumbs = [
    { href: "/mf", label: c.brand },
    ...parts.map((part, index) => {
      const meeting = meetings.find((m) => m.id === part);
      return { href: `/mf/${parts.slice(0, index + 1).join("/")}`, label: meeting ? arCode(meeting.ar) : (labels[part] ?? part) };
    }),
  ];
  const processing = meetings.filter((m) => m.status === "processing").length;

  return (
    <div className="sticky top-0 z-30 hidden h-11 items-center justify-between border-b border-mf-300 bg-mf-50/95 px-6 backdrop-blur lg:flex lg:px-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12.5px]">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 && <span className="text-mf-500">/</span>}
            {index === crumbs.length - 1 ? (
              <span className="text-white">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-mf-600 transition-colors hover:text-white">
                {crumb.label}
              </Link>
            )}
          </Fragment>
        ))}
      </nav>
      <div className="flex items-center gap-2 text-[12px] text-mf-600">
        <span className={cx("size-1.5 rounded-full", processing ? "mf-blink bg-mf-warn" : "bg-mf-ok")} />
        {processing ? `${processing} ${lang === "pt" ? "em processamento" : "processing"}` : lang === "pt" ? "Todos os serviços operando" : "All systems operational"}
      </div>
    </div>
  );
}

export function MfShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { c } = useCopy();
  const [open, setOpen] = useState(false);

  // The print view is a bare sheet of paper.
  if (pathname.endsWith("/imprimir") || pathname === "/mf/acesso") return <>{children}</>;

  return (
    <div className="flex min-h-dvh bg-mf-50 text-mf-900">
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 border-r border-mf-300 bg-mf-0 lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label={c.close} className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="mf-rise relative h-full w-[284px] max-w-[85vw] border-r border-mf-400 bg-mf-0">
            <button
              type="button"
              aria-label={c.close}
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-none text-mf-700 hover:text-white"
            >
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-mf-300 bg-mf-0/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label={c.menu}
            onClick={() => setOpen(true)}
            className="flex size-9 items-center justify-center rounded-none text-mf-800 hover:bg-mf-200"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/mf" className="flex items-center gap-2.5">
            <Image src="/mf/mf-logo-black.png" alt="Minerbo-Fuchs" width={206} height={105} className="h-6 w-auto invert" />
            <span className="mf-brand text-[11px] font-bold text-white">{c.brand.toUpperCase()}</span>
          </Link>
          <Link href="/mf/atas/nova" aria-label={c.newAta} className="flex size-9 items-center justify-center rounded-none bg-white text-black">
            <Plus className="size-4" />
          </Link>
        </header>
        <SystemBar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
