import type { ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft } from "lucide-react";
import type { Industry } from "@/lib/industries";
import base from "./industry.module.css";
import styles from "./industry-hero.module.css";

type HeroLink = { id: string; label: string; detail: string };

type IndustryHeroProps = {
  industry: Industry;
  index: number;
  headline: string;
  summary: string;
  links: HeroLink[];
  media: ReactNode;
};

export function IndustryHero({ industry, index, headline, summary, links, media }: IndustryHeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="industry-title">
      <div className={styles.inner}>
        <Link href="/#industries" className={base.back}><ArrowLeft size={14} /> Industries / {String(index + 1).padStart(2, "0")} {industry.name}</Link>
        <div className={styles.layout}>
          <div className={styles.copy}>
            <h1 id="industry-title" className={styles.headline}>{headline}</h1>
            <p className={styles.lead}>{summary}</p>
          </div>
          <div className={styles.media}>{media}</div>
        </div>
        <nav className={styles.nav} aria-label="What we can build">
          {links.map((link, linkIndex) => (
            <a key={link.id} href={`#${link.id}`}>
              <span className={styles.navIndex}>{String(linkIndex + 1).padStart(2, "0")}</span>
              <span className={styles.navLabel}>{link.label}</span>
              <span className={styles.navDetail}>{link.detail}</span>
              <ArrowDown size={15} strokeWidth={1.4} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}

// The panel is never wider than 600 CSS px, so every source at least 600 × 400 renders at or below native size.
export function HeroPhoto({ src, alt, position = "50% 50%" }: { src: string | StaticImageData; alt: string; position?: string }) {
  return <Image src={src} alt={alt} fill preload sizes="(max-width: 1100px) 100vw, 600px" className={styles.photo} style={{ objectPosition: position }} />;
}

export function HeroDrawing({ children }: { children: ReactNode }) {
  return <div className={styles.drawing}>{children}</div>;
}
