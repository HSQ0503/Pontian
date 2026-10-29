"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, LoaderCircle, X } from "lucide-react";
import { useEffect, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { useCopy } from "@/lib/mf/copy";
import { RISK, STATUS } from "@/lib/mf/sections";
import type { ItemStatus, MeetingStatus, Risk } from "@/lib/mf/types";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-white text-black hover:bg-mf-900 disabled:bg-mf-500 disabled:text-mf-700",
  secondary: "bg-white/[0.08] text-white hover:bg-white/[0.13] disabled:text-mf-600",
  ghost: "text-mf-800 hover:bg-white/[0.07] hover:text-white disabled:text-mf-600",
  danger: "bg-white/[0.06] text-mf-800 hover:bg-mf-rec/15 hover:text-mf-rec",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-[9px] px-3 text-[13px]",
  md: "h-10 gap-2 rounded-[11px] px-4 text-[14px]",
  lg: "h-12 gap-2.5 rounded-[13px] px-6 text-[15px]",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  href?: string;
} & ComponentProps<"button">;

export function Button({ variant = "secondary", size = "md", icon, loading, href, className, children, ...rest }: ButtonProps) {
  const classes = cx(
    "inline-flex shrink-0 select-none items-center justify-center font-medium transition-colors duration-150 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
  const content = (
    <>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : icon}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} disabled={loading || rest.disabled} {...rest}>
      {content}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: { label: string } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("inline-flex size-9 items-center justify-center rounded-full text-mf-700 transition-colors hover:bg-white/[0.08] hover:text-white", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <div className="mb-1.5 text-[13px] text-mf-600">{eyebrow}</div>}
        <h1 className="text-[28px] font-bold leading-tight text-white">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mf-600">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={cx("mx-auto w-full px-4 pb-20 pt-8 sm:px-6 md:pt-10 lg:px-10", wide ? "max-w-[1440px]" : "max-w-[1200px]")}>
      {children}
    </div>
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-2xl bg-mf-100 ring-1 ring-white/[0.06]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, lead, action }: { title: ReactNode; lead?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
      <div>
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        {lead && <p className="mt-1 text-[13px] leading-relaxed text-mf-600">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

// Open/closed state is a per-person convenience, so it lives in this browser only.
// The server always renders the default, and the stored choice applies after hydration.
const toggleMemory = new Map<string, boolean>();
const toggleListeners = new Set<() => void>();

export function usePersistentToggle(key: string, initial: boolean) {
  const storageKey = `mf-open:${key}`;
  const read = () => {
    if (toggleMemory.has(storageKey)) return toggleMemory.get(storageKey)!;
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === null ? initial : stored === "1";
    } catch {
      return initial;
    }
  };
  const open = useSyncExternalStore(
    (listener) => {
      toggleListeners.add(listener);
      return () => {
        toggleListeners.delete(listener);
      };
    },
    read,
    () => initial,
  );
  const toggle = () => {
    toggleMemory.set(storageKey, !open);
    try {
      window.localStorage.setItem(storageKey, open ? "0" : "1");
    } catch {}
    toggleListeners.forEach((listener) => listener());
  };
  return [open, toggle] as const;
}

// Disclosure section in the style of Apple's grouped lists: the header toggles, the body eases open.
export function Section({
  id,
  title,
  count,
  aside,
  defaultOpen = true,
  className,
  children,
}: {
  id: string;
  title: ReactNode;
  count?: number;
  aside?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, toggle] = usePersistentToggle(id, defaultOpen);
  return (
    <section className={cx("rounded-2xl bg-mf-100 ring-1 ring-white/[0.06]", className)}>
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
        >
          <ChevronRight className={cx("size-4 shrink-0 text-mf-600 transition-transform duration-200", open && "rotate-90")} strokeWidth={2.25} />
          <h2 className="truncate text-[15px] font-semibold text-white">{title}</h2>
          {count !== undefined && (
            <span className="mf-num rounded-full bg-white/[0.08] px-2 py-px text-[12px] font-medium text-mf-700">{count}</span>
          )}
        </button>
        {aside && <div className="shrink-0 pr-2">{aside}</div>}
      </div>
      <div className={cx("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="px-2 pb-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function Tag({ children, className, tone = "default" }: { children: ReactNode; className?: string; tone?: "default" | "solid" | "warn" | "ok" | "rec" }) {
  const tones = {
    default: "bg-white/[0.08] text-mf-800",
    solid: "bg-white text-black",
    warn: "bg-mf-warn/15 text-mf-warn",
    ok: "bg-mf-ok/15 text-mf-ok",
    rec: "bg-mf-rec/15 text-mf-rec",
  };
  return (
    <span className={cx("inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function MeetingStatusTag({ status }: { status: MeetingStatus }) {
  const { c } = useCopy();
  const tone = { processing: "default", draft: "warn", approved: "ok", failed: "rec" } as const;
  return (
    <Tag tone={tone[status]}>
      {status === "processing" && <LoaderCircle className="size-3 animate-spin" />}
      {c.meetingStatus[status]}
    </Tag>
  );
}

export function ItemStatusTag({ status, lang }: { status: ItemStatus; lang: "pt" | "en" }) {
  const style = {
    info: "bg-white/[0.08] text-mf-800",
    progress: "bg-white text-black",
    closed: "bg-white/[0.05] text-mf-600",
  };
  return (
    <span className={cx("inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium", style[status])}>{STATUS[status][lang]}</span>
  );
}

export function RiskBars({ risk, lang, showLabel = true }: { risk: Risk; lang: "pt" | "en"; showLabel?: boolean }) {
  const level = { low: 1, medium: 2, high: 3 }[risk];
  return (
    <span className="inline-flex items-center gap-1.5" title={RISK[risk][lang]}>
      <span className="flex items-end gap-[2px]">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cx("w-[3px] rounded-full", bar <= level ? (level === 3 ? "bg-mf-rec" : "bg-white") : "bg-mf-400")}
            style={{ height: 4 + bar * 3 }}
          />
        ))}
      </span>
      {showLabel && <span className="text-[12px] text-mf-700">{RISK[risk][lang]}</span>}
    </span>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium text-mf-700">{label}</span>
      {children}
      {hint && <span className="text-[12.5px] leading-snug text-mf-600">{hint}</span>}
    </label>
  );
}

const control =
  "w-full rounded-[11px] border border-white/[0.08] bg-white/[0.05] px-3 text-[14px] text-white placeholder:text-mf-600 transition-colors focus:border-white/25 focus:bg-white/[0.07] focus:outline-none disabled:opacity-60";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(control, "h-10", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(control, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <span className={cx("relative block", className)}>
      <select className={cx(control, "h-10 appearance-none pr-9")} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-mf-600" />
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-[11px] bg-white/[0.07] p-[3px]" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] font-medium transition-all duration-150",
            size === "sm" ? "h-7 px-3 text-[12.5px]" : "h-8 px-3.5 text-[13px]",
            value === option.value ? "bg-mf-500 text-white shadow-[0_1px_3px_rgba(0,0,0,0.4)]" : "text-mf-700 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}

export function Drawer({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex justify-end p-0 sm:p-3">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <aside className="mf-rise relative flex h-full w-full max-w-[540px] flex-col overflow-hidden bg-mf-100 ring-1 ring-white/[0.08] sm:rounded-2xl">
        <div className="flex items-center justify-between px-6 pb-3 pt-5">
          <h2 className="text-[17px] font-semibold text-white">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="mf-scroll flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
}

export function Modal({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="mf-rise relative w-full max-w-lg overflow-hidden rounded-2xl bg-mf-100 ring-1 ring-white/[0.08]">
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="text-[17px] font-semibold text-white">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, lead, action }: { icon: ReactNode; title: ReactNode; lead?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-mf-100 px-6 py-16 text-center ring-1 ring-white/[0.06]">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white/[0.07] text-mf-800">{icon}</div>
      <h3 className="text-[17px] font-semibold text-white">{title}</h3>
      {lead && <p className="mt-2 max-w-md text-[14px] leading-relaxed text-mf-600">{lead}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("mf-skeleton rounded-xl", className)} />;
}

export function LoadingPage() {
  return (
    <Page>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-9 w-80" />
      <Skeleton className="mt-3 h-4 w-[520px] max-w-full" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </Page>
  );
}

export function Avatar({ name, index, size = 32 }: { name: string; index: number; size?: number }) {
  // Monochrome shades instead of colors keep speakers distinct within MF's palette.
  const shades = ["bg-white text-black", "bg-mf-800 text-black", "bg-mf-500 text-white", "bg-mf-300 text-white ring-1 ring-mf-600", "bg-black text-white ring-1 ring-mf-700", "bg-mf-600 text-white"];
  const initialsText = name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word, i, words) => (i === 0 || i === words.length - 1 ? word[0] : ""))
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", shades[index % shades.length])}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsText}
    </span>
  );
}
