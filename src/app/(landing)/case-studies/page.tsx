import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { FrontierHeader } from "@/components/landing/frontier-header";
import { LegalLinks } from "@/components/legal/legal-links";
import { JsonLd } from "@/components/seo/json-ld";
import { caseStudies, caseStudyHref } from "@/lib/case-studies";
import { absoluteUrl, breadcrumbNode, graph, organizationId, pageMetadata, websiteId } from "@/lib/seo";
import frontier from "../frontier.module.css";
import { CaseCard } from "./case-card";
import styles from "./case-studies.module.css";

const description = "Pontian Technologies case studies: custom software, data systems and AI tools built around how six clients work, across engineering, education, home services, pet retail, real estate development and transport.";

export const metadata = pageMetadata({
  title: "Case Studies",
  description,
  path: "/case-studies",
  socialTitle: "Case studies · Pontian Technologies",
});

function structuredData() {
  const url = absoluteUrl("/case-studies");
  return graph(
    {
      "@type": "CollectionPage",
      "@id": `${url}#collection`,
      url,
      name: "Pontian Technologies case studies",
      description,
      inLanguage: "en",
      isPartOf: { "@id": websiteId },
      about: { "@id": organizationId },
      publisher: { "@id": organizationId },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: caseStudies.length,
        itemListElement: caseStudies.map((study, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(caseStudyHref(study.slug)),
          name: `${study.client}: ${study.title}`,
        })),
      },
    },
    breadcrumbNode([{ name: "Pontian", path: "/" }, { name: "Case studies", path: "/case-studies" }]),
  );
}

export default function CaseStudiesPage() {
  return (
    <div className={`${frontier.home} ${styles.page}`}>
      <JsonLd data={structuredData()} />
      <a className={frontier.skip} href="#case-studies-content">Skip to content</a>
      <FrontierHeader context="Case studies" />
      <main id="case-studies-content">
        <section className={styles.hero} aria-labelledby="case-studies-title">
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}><span className={styles.accent} aria-hidden="true"><span /><span /><span /></span>Case studies</p>
              <h1 id="case-studies-title" className={styles.heroTitle}>Software built around how our clients work.</h1>
              <p className={styles.heroLead}>Six engagements across engineering, education, home services, pet retail, real estate and transport. Each one starts from the records and routines the business already has.</p>
            </div>
            <nav className={styles.heroAside} aria-label="Clients">
              <ol className={styles.directory}>
                {caseStudies.map((study, index) => (
                  <li key={study.slug} style={{ "--accent": study.pairing.backgroundColor } as CSSProperties}>
                    <a href={`#${study.slug}`}>
                      <span className={styles.directoryIndex}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={styles.directoryName}>{study.client}</span>
                      <span className={styles.directoryIndustry}>{study.industry}</span>
                      <ArrowDown size={15} strokeWidth={1.4} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </section>

        <section className={styles.cards} aria-label="Client case studies">
          <ol className={styles.grid}>
            {caseStudies.map((study, index) => (
              <li key={study.slug} id={study.slug} className={styles.cardItem}>
                <CaseCard study={study} index={index} />
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.statement} aria-labelledby="case-studies-note">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="case-studies-note" className={styles.statementText}>These pages describe what we built and how it fits each client’s work. They are not performance reports.</h2>
          <p className={styles.statementBody}>Every product view uses example data. Client records, figures and commercial terms stay private.</p>
          <Link href="/get-started" className={styles.button}>Talk through your operation <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className={styles.legal}>
        <LegalLinks />
      </footer>
    </div>
  );
}
