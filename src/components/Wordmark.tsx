import Link from "next/link";

type Props = {
  className?: string;
  href?: string;
};

// The logo is the word itself, set in Shouqi Serif SemiBold.
export function Wordmark({ className = "text-2xl", href }: Props) {
  const mark = (
    <span className={`font-display text-sky select-none ${className}`}>
      Pontian
    </span>
  );
  if (!href) return mark;
  return (
    <Link href={href} className="inline-block" aria-label="Pontian">
      {mark}
    </Link>
  );
}
