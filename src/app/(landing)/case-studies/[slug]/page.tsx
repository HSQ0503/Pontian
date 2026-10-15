import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { FrontierHeader } from "@/components/landing/frontier-header";
import { JsonLd } from "@/components/seo/json-ld";
import { caseStudies, caseStudyHref, findCaseStudy, type CaseStudy } from "@/lib/case-studies";
import { absoluteUrl, breadcrumbNode, founderNodes, founders, graph, organizationId, pageMetadata, websiteId } from "@/lib/seo";
import frontier from "../../frontier.module.css";
import { CaseCard } from "../case-card";
import { CaseModel } from "../models";
import styles from "../case-studies.module.css";

export const dynamicParams = false;
const PUBLISHED = "2026-10-15";

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: PageProps<"/case-studies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = findCaseStudy(slug);
  if (!found) notFound();
  const { study } = found;
  return pageMetadata({
    title: `${study.client} case study`,
    description: study.description,
    path: caseStudyHref(study.slug),
    socialTitle: `${study.client}: ${study.title}`,
    type: "article",
  });
}

function structuredData(study: CaseStudy) {
  const url = absoluteUrl(caseStudyHref(study.slug));
  return graph(
    {
      "@type": "Article",
      "@id": `${url}#article`,
      url,
      mainEntityOfPage: url,
      headline: study.title,
      alternativeHeadline: `${study.client} case study`,
      description: study.description,
      articleSection: "Case studies",
      genre: "Case study",
      keywords: [study.industry, "case study", "custom software", "Pontian Technologies"],
      inLanguage: "en",
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      image: absoluteUrl("/og.png"),
      isPartOf: [{ "@id": `${absoluteUrl("/case-studies")}#collection` }, { "@id": websiteId }],
      about: { "@type": "Organization", name: study.client, description: `${study.industry} business` },
      publisher: { "@id": organizationId },
      author: [{ "@id": organizationId }, ...founders.map((founder) => ({ "@id": founder.id }))],
      articleBody: [study.intro, ...study.sections.flatMap((section) => section.blocks.flatMap((block) => (block.type === "p" ? [block.text] : block.items.map((item) => `${item.lead ? `${item.lead} ` : ""}${item.text}`))))].join(" "),
    },
    ...founderNodes(),
    breadcrumbNode([{ name: "Pontian", path: "/" }, { name: "Case studies", path: "/case-studies" }, { name: study.client, path: caseStudyHref(study.slug) }]),
  );
}

export default async function CaseStudyPage({ params }: PageProps<"/case-studies/[slug]">) {
  const { slug } = await params;
  const found = findCaseStudy(slug);
  if (!found) notFound();
  const { study, index } = found;
  const previous = caseStudies[(index - 1 + caseStudies.length) % caseStudies.length];
  const next = caseStudies[(index + 1) % caseStudies.length];
  const accents = ["#f51625", "#fed603", "#007dfe", "#eeeeec"];

  return (
    <div className={`${frontier.home} ${styles.page}`}>
      <JsonLd data={structuredData(study)} />
      <a className={frontier.skip} href="#case-study-content">Skip to content</a>
      <FrontierHeader context="Case studies" />
      <main id="case-study-content">
        <section className={styles.hero} aria-labelledby="case-study-title">
          <Link href="/case-studies" className={styles.back}><ArrowLeft size={14} aria-hidden="true" /> Back to case studies</Link>
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.clientLine}>
                <span className={styles.industryChip} style={study.pairing}>{study.industry}</span>
                <span className={styles.clientName}>{study.client}{study.clientDetail && <span className={styles.clientDetail}> · {study.clientDetail}</span>}</span>
              </p>
              <h1 id="case-study-title" className={styles.detailTitle}>{study.title}</h1>
              <p className={styles.heroLead}>{study.intro}</p>
            </div>
            <aside className={`${styles.facts} ${styles.heroAside}`} aria-label="Engagement">
              <dl className={styles.factList}>
                <div><dt>Client</dt><dd>{study.client}{study.clientDetail && ` · ${study.clientDetail}`}</dd></div>
                <div><dt>Industry</dt><dd>{study.industry}</dd></div>
                <div><dt>Engagement</dt><dd>{study.engagement}</dd></div>
                {study.location && <div><dt>Location</dt><dd>{study.location}</dd></div>}
              </dl>
              <nav aria-label="On this page">
                <ol className={styles.onPage}>
                  {study.sections.map((section, sectionIndex) => (
                    <li key={section.id} style={{ "--accent": accents[sectionIndex % accents.length] } as CSSProperties}>
                      <a href={`#${section.id}`}>
                        <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                        <span>{section.heading}</span>
                        <ArrowDown size={14} strokeWidth={1.4} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                  <li style={{ "--accent": "#a8a8a5" } as CSSProperties}>
                    <a href="#example">
                      <span>3D</span>
                      <span>Example illustration</span>
                      <ArrowDown size={14} strokeWidth={1.4} aria-hidden="true" />
                    </a>
                  </li>
                </ol>
              </nav>
            </aside>
          </div>
        </section>

        {study.sections.map((section, sectionIndex) => (
          <section key={section.id} id={section.id} className={styles.chapter} aria-labelledby={`${section.id}-title`}>
            <div className={styles.chapterGrid}>
              <div className={styles.chapterHead}>
                <p className={styles.chapterLabel}><span className={styles.chapterIndex}>{String(sectionIndex + 1).padStart(2, "0")}</span>{study.client}</p>
                <h2 id={`${section.id}-title`} className={styles.chapterTitle}>{section.heading}</h2>
              </div>
              <div className={styles.chapterBody}>
                {section.blocks.map((block, blockIndex) => block.type === "p"
                  ? <p key={blockIndex} className={styles.prose}>{block.text}</p>
                  : (
                    <ol key={blockIndex} className={styles.workList}>
                      {block.items.map((item) => <li key={item.text}><p>{item.lead && <strong>{item.lead}</strong>}{item.text}</p></li>)}
                    </ol>
                  ))}
              </div>
            </div>
            {sectionIndex === 1 && (
              <div id="example" className={styles.modelBlock}>
                <div className={styles.modelIntro}>
                  <h3>See how it fits together</h3>
                  <p>An interactive illustration with example data. It shows the shape of the work, not the client’s records or results.</p>
                </div>
                <CaseModel slug={study.slug} />
              </div>
            )}
          </section>
        ))}

        <section className={styles.more} aria-labelledby="more-title">
          <div className={styles.moreHead}>
            <h2 id="more-title" className={styles.moreTitle}>More case studies</h2>
            <Link href="/case-studies" className={styles.moreLink}>All case studies <ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" /></Link>
          </div>
          <ol className={styles.grid}>
            {[{ item: previous, at: caseStudies.indexOf(previous) }, { item: next, at: caseStudies.indexOf(next) }].map(({ item, at }) => (
              <li key={item.slug} className={styles.cardItem}><CaseCard study={item} index={at} headingLevel="h3" /></li>
            ))}
          </ol>
        </section>

        <section className={styles.statement} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.statementText}>Is your team working around scattered records too?</h2>
          <p className={styles.statementBody}>Tell us how the work moves today. We start from there.</p>
          <Link href="/get-started" className={styles.button}>Talk through a project <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href="/case-studies"><ArrowLeft size={14} aria-hidden="true" /> All case studies</Link>
        <Link href={caseStudyHref(next.slug)}>Next: {next.client} <ArrowRight size={14} aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
