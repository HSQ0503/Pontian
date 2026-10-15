import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { caseStudies, caseStudyHref, type CaseStudy } from "@/lib/case-studies";
import { CasePreview } from "./models";
import styles from "./case-studies.module.css";

export function CaseCard({ study, index, headingLevel = "h2" }: { study: CaseStudy; index: number; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <article className={styles.card} style={{ "--accent": study.pairing.backgroundColor } as CSSProperties}>
      <div className={styles.cardMedia} aria-hidden="true">
        <span className={styles.cardDrawing}><CasePreview slug={study.slug} /></span>
        <span className={styles.caption} style={study.pairing}>
          <span className={styles.captionIndustry}>{study.industry}</span>
          <span className={styles.captionClient}>{study.client}</span>
        </span>
        <span className={styles.cardCount}>{String(index + 1).padStart(2, "0")} / {String(caseStudies.length).padStart(2, "0")}</span>
      </div>
      <div className={styles.cardBody}>
        <Heading className={styles.cardTitle}>
          <Link href={caseStudyHref(study.slug)}>{study.title}</Link>
        </Heading>
        <p className={styles.cardOverview}><span className="sr-only">{study.client}, {study.industry}. </span>{study.overview}</p>
        <p className={styles.cardFoot} aria-hidden="true"><span>Read the case study</span><ArrowUpRight size={17} strokeWidth={1.5} /></p>
      </div>
    </article>
  );
}
