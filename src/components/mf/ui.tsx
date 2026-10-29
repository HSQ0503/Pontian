"use client";

import Link from "next/link";
import { ChevronDown, LoaderCircle, X } from "lucide-react";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { useCopy } from "@/lib/mf/copy";
import { RISK, STATUS } from "@/lib/mf/sections";
import type { ItemStatus, MeetingStatus, Risk } from "@/lib/mf/types";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-white text-black hover:bg-mf-900 disabled:bg-mf-500 disabled:text-mf-700",
  secondary: "border border-mf-400 bg-mf-150 text-mf-950 hover:border-mf-600 hover:bg-mf-200 disabled:text-mf-600",
  ghost: "text-mf-800 hover:bg-mf-200 hover:text-white disabled:text-mf-600",
  danger: "border border-mf-400 text-mf-800 hover:border-mf-rec hover:text-mf-rec",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-[13px]",
  md: "h-11 gap-2 px-4.5 text-[14px]",
  lg: "h-13 gap-2.5 px-6 text-[15px]",
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
    "inline-flex shrink-0 select-none items-center justify-center rounded-[2px] font-semibold tracking-[0.01em] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed",
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
      className={cx(
        "inline-flex size-10 items-center justify-center rounded-none text-mf-700 transition-colors hover:bg-mf-200 hover:text-white focus-visible:outline-2 focus-visible:outline-white",
        className,
      )}
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
    <header className="flex flex-col gap-5 border-b border-mf-300 pb-7 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <div className="mf-eyebrow mb-3 text-mf-700">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-white md:text-[34px]">{title}</h1>
        {lead && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mf-700">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={cx("mx-auto w-full px-4 pb-20 pt-8 sm:px-6 md:pt-10 lg:px-10", wide ? "max-w-[1480px]" : "max-w-[1240px]")}>
      {children}
    </div>
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-none border border-mf-300 bg-mf-100", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, lead, action }: { title: ReactNode; lead?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-mf-300 px-5 py-4">
      <div>
        <h2 className="mf-eyebrow text-white">{title}</h2>
        {lead && <p className="mt-1 text-[13.5px] leading-relaxed text-mf-700">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tag({ children, className, tone = "default" }: { children: ReactNode; className?: string; tone?: "default" | "solid" | "warn" | "ok" | "rec" }) {
  const tones = {
    default: "border-mf-400 text-mf-800",
    solid: "border-white bg-white text-black",
    warn: "border-mf-warn/40 bg-mf-warn/10 text-mf-warn",
    ok: "border-mf-ok/40 bg-mf-ok/10 text-mf-ok",
    rec: "border-mf-rec/40 bg-mf-rec/10 text-mf-rec",
  };
  return (
    <span
      className={cx(
        "mf-num inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-none border px-2 text-[10.5px] font-medium uppercase tracking-[0.06em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MeetingStatusTag({ status }: { status: MeetingStatus }) {
  const { c } = useCopy();
  const tone = { processing: "default", draft: "warn", approved: "ok", failed: "rec" } as const;
  return (
    <Tag tone={tone[status]}>
      {status === "processing" ? <LoaderCircle className="size-3 animate-spin" /> : <span className="size-1.5 rounded-none bg-current" />}
      {c.meetingStatus[status]}
    </Tag>
  );
}

export function ItemStatusTag({ status, lang }: { status: ItemStatus; lang: "pt" | "en" }) {
  const style = {
    info: "border-mf-400 text-mf-800",
    progress: "border-white bg-white text-black",
    closed: "border-mf-400 bg-mf-300 text-mf-700 line-through decoration-mf-600",
  };
  return (
    <span className={cx("inline-flex h-5 items-center whitespace-nowrap rounded-none border px-1.5 text-[10.5px] font-semibold", style[status])}>
      {STATUS[status][lang]}
    </span>
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
            className={cx("w-[3px] rounded-[1px]", bar <= level ? (level === 3 ? "bg-mf-rec" : "bg-white") : "bg-mf-400")}
            style={{ height: 4 + bar * 3 }}
          />
        ))}
      </span>
      {showLabel && <span className="text-[11.5px] text-mf-800">{RISK[risk][lang]}</span>}
    </span>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="mf-eyebrow text-mf-700">{label}</span>
      {children}
      {hint && <span className="text-[12.5px] leading-snug text-mf-600">{hint}</span>}
    </label>
  );
}

const control =
  "w-full rounded-[2px] border border-mf-500 bg-mf-50 px-3.5 text-[14.5px] text-white placeholder:text-mf-600 transition-colors focus:border-mf-800 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-60";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(control, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(control, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <span className={cx("relative block", className)}>
      <select className={cx(control, "h-11 appearance-none pr-9")} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-mf-700" />
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
    <div className="inline-flex rounded-none border border-mf-500 bg-mf-50 p-0.5" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] font-semibold transition-colors",
            size === "sm" ? "h-8 px-3 text-[12.5px]" : "h-10 px-3.5 text-[13.5px]",
            value === option.value ? "bg-white text-black" : "text-mf-700 hover:text-white",
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="mf-rise relative flex h-full w-full max-w-[540px] flex-col border-l border-mf-400 bg-mf-100">
        <div className="flex items-center justify-between border-b border-mf-300 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-white">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="mf-scroll flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="flex items-center justify-between gap-3 border-t border-mf-300 px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
}

export function Modal({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className="mf-rise relative w-full max-w-lg rounded-none border border-mf-400 bg-mf-100">
        <div className="flex items-center justify-between border-b border-mf-300 px-6 py-4">
          <h2 className="text-[15px] font-semibold text-white">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-mf-300 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, lead, action }: { icon: ReactNode; title: ReactNode; lead?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-none border border-dashed border-mf-400 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-none border border-mf-400 text-mf-800">{icon}</div>
      <h3 className="text-[17px] font-semibold text-white">{title}</h3>
      {lead && <p className="mt-2 max-w-md text-[14px] leading-relaxed text-mf-700">{lead}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("mf-skeleton rounded-none", className)} />;
}

export function LoadingPage() {
  return (
    <Page>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-9 w-80" />
      <Skeleton className="mt-3 h-4 w-[520px] max-w-full" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
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
      className={cx("inline-flex shrink-0 items-center justify-center rounded-none font-semibold", shades[index % shades.length])}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsText}
    </span>
  );
}
