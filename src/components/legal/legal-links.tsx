import Link from "next/link";
import styles from "./legal.module.css";

export function LegalLinks({ className = "", locale = "en" }: { className?: string; locale?: "en" | "pt" }) {
  return (
    <nav className={`${styles.links} ${className}`} aria-label={locale === "pt" ? "Informações legais" : "Legal information"}>
      <Link href="/privacy">{locale === "pt" ? "Privacidade (EN)" : "Privacy Policy"}</Link>
      <Link href="/terms">{locale === "pt" ? "Termos de Serviço (EN)" : "Terms of Service"}</Link>
    </nav>
  );
}
