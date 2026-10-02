import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { industries } from "@/lib/industries";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import styles from "./industry.module.css";

export function generateStaticParams() {
  return industries.map((industry) => ({ industry: industry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const { industry: slug } = await params;
  const industry = industries.find((item) => item.slug === slug);
  if (!industry) notFound();
  return { title: industry.name, description: `Pontian for ${industry.name.toLowerCase()}. ${industry.headline}` };
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry: slug } = await params;
  const index = industries.findIndex((item) => item.slug === slug);
  const industry = industries[index];
  if (!industry) notFound();
  return (
    <div className={`${frontier.home} ${styles.page}`}>
      <a className={frontier.skip} href="#industry-content">Skip to content</a>
      <FrontierHeader />
      <main id="industry-content">
        <section key={industry.slug} className={styles.hero} aria-labelledby="industry-title">
          <div className={styles.photoFrame}>
            <Image src={industry.image} alt={industry.alt} fill preload sizes="100vw" className={styles.photo} style={industry.heroPosition ? { objectPosition: industry.heroPosition } : undefined} />
          </div>
          <div className={styles.shade} />
          <div className={styles.heroCopy}>
            <Link href="/#industries" className={styles.back}><ArrowLeft size={14} /> Industries / {String(index + 1).padStart(2, "0")}</Link>
            <h1 id="industry-title" className={industry.name.length > 14 ? styles.longTitle : undefined}>{industry.name}<span>.</span></h1>
            <div className={styles.heroBottom}>
              <span className={styles.bars} aria-hidden="true"><i /><i /><i /></span>
              <a href="#capabilities" className={styles.explore} aria-label={`Explore ${industry.name.toLowerCase()} page`}><ArrowDown size={22} strokeWidth={1.4} /></a>
            </div>
          </div>
        </section>

        {/* Intentionally empty: approved industry and capability copy comes next. */}
        <section id="capabilities" className={styles.capabilities} aria-label={`${industry.name} capabilities, content coming soon`}>
          <div className={styles.introSpace} aria-hidden="true"><span /><span /></div>
          <div className={styles.panels} aria-hidden="true">
            <div className={styles.panel}><span className={styles.index}>01</span><div className={styles.diamond} /></div>
            <div className={styles.panel}><span className={styles.index}>02</span><div className={styles.diamond} /></div>
            <div className={styles.panel}><span className={styles.index}>03</span><div className={styles.diamond} /></div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href="/#industries"><ArrowLeft size={14} /> All industries</Link>
        <span>Pontian / {industry.name}</span>
      </footer>
    </div>
  );
}
