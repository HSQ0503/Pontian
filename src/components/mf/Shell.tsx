"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
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
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useCopy } from "@/lib/mf/copy";
import { arCode } from "@/lib/mf/format";
import { useMf } from "@/lib/mf/store";
import { cx, usePersistentToggle } from "./ui";

// Clear at rest; frosted with a hairline only once content scrolls underneath, like Apple's scroll edge.
const TOOLBAR_EDGE =
  "transition-[background-color,box-shadow,backdrop-filter] duration-200 group-data-[scrolled=true]/pane:bg-[rgba(14,14,17,0.86)] group-data-[scrolled=true]/pane:shadow-[0_1px_0_rgba(255,255,255,0.07)] group-data-[scrolled=true]/pane:backdrop-blur-2xl";

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

function NavGroup({ label, collapsible, children }: { label: string; collapsible?: boolean; children: ReactNode }) {
  const [open, toggle] = usePersistentToggle(`sidebar-${label}`, !collapsible);
  if (!label.trim()) return <div className="mb-4 flex flex-col gap-px">{children}</div>;
  if (!collapsible) {
    return (
      <div className="mb-4">
        <div className="mb-1 px-2.5 text-[12px] font-medium text-mf-600">{label}</div>
        <div className="flex flex-col gap-px">{children}</div>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <button type="button" onClick={toggle} aria-expanded={open} className="mb-1 flex w-full items-center gap-1 rounded-md px-2.5 py-0.5 text-[12px] font-medium text-mf-600 hover:text-mf-800">
        {label}
        <ChevronRight className={cx("size-3 transition-transform duration-200", open && "rotate-90")} strokeWidth={2.5} />
      </button>
      <div className={cx("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="flex flex-col gap-px overflow-hidden">{children}</div>
      </div>
    </div>
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
          className="glass-white flex h-9 w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-medium active:scale-[0.98]"
        >
          <Plus className="size-4" />
          {c.newAta}
        </Link>
      </div>

      <nav className="mf-scroll mt-5 flex-1 overflow-y-auto px-3">
        {groups.map((group) => (
          <NavGroup key={group.label} label={group.label} collapsible={group.muted}>
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cx(
                    "group relative flex h-8 items-center gap-2.5 rounded-full px-3 text-[13.5px] transition-colors",
                    active ? "bg-white/[0.12] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" : item.preview ? "text-mf-600 hover:bg-white/[0.05] hover:text-mf-900" : "text-mf-800 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <item.icon className={cx("size-4", active ? "text-white" : "text-mf-600 group-hover:text-mf-800")} strokeWidth={1.75} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </NavGroup>
        ))}

        {processing.length > 0 && (
          <div className="mb-5 rounded-[18px] bg-white/[0.06] p-3">
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

      <div className="mx-3 mb-3 flex items-center gap-3 rounded-[18px] bg-white/[0.05] px-3 py-2.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-white/[0.1] text-[10.5px] font-semibold text-white">MF</span>
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
    <div className={cx("sticky top-0 z-30 hidden h-12 shrink-0 items-center justify-between px-6 lg:flex lg:px-10", TOOLBAR_EDGE)}>
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

  // Pages scroll inside the glass pane, so a new route starts at its top, and the
  // toolbar only frosts once something has scrolled beneath it.
  useEffect(() => {
    const scroller = document.getElementById("mf-scroll");
    if (!scroller) return;
    scroller.scrollTo({ top: 0 });
    const update = () => {
      scroller.dataset.scrolled = scroller.scrollTop > 2 ? "true" : "false";
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
  }, [pathname]);

  // The print view is a bare sheet of paper.
  if (pathname.endsWith("/imprimir") || pathname === "/mf/acesso") return <>{children}</>;

  return (
    <div className="flex h-dvh gap-3 overflow-hidden p-2 text-mf-900 lg:p-3">
      <div aria-hidden className="mf-ambient" />
      <aside className="hidden w-[264px] shrink-0 lg:block">
        <div className="glass-strong h-full rounded-[26px]">
          <Sidebar />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label={c.close} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="glass-strong mf-rise relative m-2 h-[calc(100%-16px)] w-[284px] max-w-[85vw] rounded-[26px]">
            <button
              type="button"
              aria-label={c.close}
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl text-mf-700 hover:text-white"
            >
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="glass-pane min-w-0 flex-1 overflow-hidden rounded-[26px] lg:rounded-[28px]">
        <div id="mf-scroll" className="group/pane mf-scroll flex h-full flex-col overflow-y-auto">
        <header className={cx("sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-2 lg:hidden", TOOLBAR_EDGE)}>
          <button
            type="button"
            aria-label={c.menu}
            onClick={() => setOpen(true)}
            className="flex size-10 items-center justify-center rounded-full text-mf-800 hover:bg-white/[0.08]"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/mf" className="flex items-center gap-2.5">
            <Image src="/mf/mf-logo-black.png" alt="Minerbo-Fuchs" width={206} height={105} className="h-6 w-auto invert" />
            <span className="mf-brand text-[11px] font-bold text-white">{c.brand.toUpperCase()}</span>
          </Link>
          <Link href="/mf/atas/nova" aria-label={c.newAta} className="glass-white flex size-10 items-center justify-center rounded-full">
            <Plus className="size-4" />
          </Link>
        </header>
        <SystemBar />
        <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
