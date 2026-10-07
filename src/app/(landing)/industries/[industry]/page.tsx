import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { industries } from "@/lib/industries";
import { LogisticsPage, logisticsMetadata } from "./logistics";
import { engagementSteps, industryPages } from "@/lib/industry-pages";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { FrontierHeader } from "@/components/landing/frontier-header";
import { industryVisuals } from "@/components/landing/industry-visuals";
import { DesignEngineeringPage, designEngineeringMetadata } from "./design-engineering";
import { RetailPage, retailMetadata } from "./retail";
import { Reveal } from "@/components/landing/reveal";
import { PropertyServicesPage, propertyServicesMetadata } from "./property-services";
import frontier from "../../frontier.module.css";
import styles from "./industry.module.css";
import { ConstructionPage, constructionHeadline, constructionSummary } from "./construction";
import { ManufacturingPage, manufacturingHeadline, manufacturingSummary } from "./manufacturing";
import { EquipmentRentalPage, equipmentRentalHeadline, equipmentRentalSummary } from "./equipment-rental";

const sections = [
  { id: "perspective", label: "Our perspective" },
  { id: "opportunities", label: "Where we can help" },
  { id: "workflow", label: "A workflow in practice" },
  { id: "approach", label: "How we start" },
  { id: "start", label: "Start a conversation" },
];

export function generateStaticParams() {
  return industries.map((industry) => ({ industry: industry.slug }));
}

export async function generateMetadata({ params }: PageProps<"/industries/[industry]">): Promise<Metadata> {
  const { industry: slug } = await params;
  if (slug === "design-engineering") return designEngineeringMetadata;
  if (slug === "retail") return retailMetadata;
  if (slug === "property-services") return propertyServicesMetadata;
  const industry = industries.find((item) => item.slug === slug);
  if (slug === "logistics") return logisticsMetadata;
  const content = industryPages[slug];
  if (!industry || (!content && slug !== "construction")) notFound();
  const title = `Pontian for ${industry.name}`;
  const description = slug === "manufacturing" ? `${manufacturingHeadline} ${manufacturingSummary}` : slug === "equipment-rental" ? `${equipmentRentalHeadline} ${equipmentRentalSummary}` : content ? `${content.promise} ${content.summary}` : `${constructionHeadline} ${constructionSummary}`;
  const url = `/industries/${industry.slug}`;
  return {
    title: industry.name,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Pontian", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pontian" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default async function IndustryPage({ params }: PageProps<"/industries/[industry]">) {
  const { industry: slug } = await params;
  if (slug === "design-engineering") return <DesignEngineeringPage />;
  if (slug === "retail") return <RetailPage />;
  if (slug === "property-services") return <PropertyServicesPage />;
  const index = industries.findIndex((item) => item.slug === slug);
  if (slug === "logistics") return <LogisticsPage index={index} />;
  const industry = industries[index];
  if (!industry) notFound();
  const next = industries[(index + 1) % industries.length];
  if (slug === "construction") return <ConstructionPage industry={industry} index={index} next={next} />;
  if (slug === "manufacturing") return <ManufacturingPage industry={industry} index={index} next={next} />;
  if (slug === "equipment-rental") return <EquipmentRentalPage industry={industry} index={index} next={next} />;
  const content = industryPages[slug];
  if (!content) notFound();
  const Visual = industryVisuals[slug];
  const engagement = [
    { title: "Starting point", text: content.engagement.start },
    { title: "What we need", text: content.engagement.information },
    { title: "First workflow", text: content.engagement.firstWorkflow },
  ];
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
              <a href="#overview" className={styles.explore} aria-label={`Explore ${industry.name.toLowerCase()} page`}><ArrowDown size={22} strokeWidth={1.4} /></a>
            </div>
          </div>
        </section>

        <section id="overview" className={`${styles.section} ${styles.overview}`} aria-labelledby="industry-promise">
          <Reveal>
            <p className={styles.label}>Pontian for {industry.name.toLowerCase()}</p>
            <h2 id="industry-promise" className={styles.promise}>{content.promise}</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className={styles.lead}>{content.intro}</p>
            <nav className={styles.toc} aria-label="On this page">
              {sections.map((section, sectionIndex) => (
                <a key={section.id} href={`#${section.id}`}>
                  <span className={styles.tocIndex}>{String(sectionIndex + 2).padStart(2, "0")}</span>
                  <span className={styles.tocLabel}>{section.label}</span>
                  <ArrowDown size={14} strokeWidth={1.5} aria-hidden="true" />
                </a>
              ))}
            </nav>
          </Reveal>
        </section>

        <section id="perspective" className={`${styles.section} ${styles.light}`} aria-labelledby="perspective-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="perspective-title" className={styles.label}>Our perspective</h2>
          <Reveal><p className={styles.thesis}>{content.perspective}</p></Reveal>
          <p className={`${styles.label} ${styles.situationsLabel}`}>Where it shows up</p>
          <ul className={styles.situations}>
            {content.situations.map((situation, situationIndex) => (
              <li key={situation}><span className={styles.situationIndex}>{String(situationIndex + 1).padStart(2, "0")}</span>{situation}</li>
            ))}
          </ul>
        </section>

        <section id="opportunities" className={`${styles.section} ${styles.grid}`} aria-labelledby="opportunities-title">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.label}>Where we can help</p>
              <h2 id="opportunities-title" className={styles.heading}>What we would connect and build.</h2>
            </div>
            <span className={styles.count}>{String(content.opportunities.length).padStart(2, "0")} opportunities</span>
          </div>
          <div className={styles.panels}>
            {content.opportunities.map((opportunity, opportunityIndex) => (
              <Reveal key={opportunity.title} delay={(opportunityIndex % 2) * 120} className={styles.panelReveal}>
                <article className={styles.panel}>
                  <div className={styles.diamond} aria-hidden="true" />
                  <span className={styles.index}>{String(opportunityIndex + 1).padStart(2, "0")}</span>
                  <h3 className={styles.panelTitle}>{opportunity.title}</h3>
                  <dl className={styles.details}>
                    <div><dt>Today</dt><dd>{opportunity.today}</dd></div>
                    <div><dt>What we build</dt><dd>{opportunity.build}</dd></div>
                    <div><dt>What it changes</dt><dd>{opportunity.result}</dd></div>
                  </dl>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="workflow" className={`${styles.section} ${styles.workflow}`} aria-labelledby="workflow-title">
          <div className={styles.workflowGrid}>
            <div>
              <p className={styles.label}>A workflow in practice</p>
              <h2 id="workflow-title" className={styles.heading}>{content.workflow.title}</h2>
              <p className={styles.note}>An illustrative workflow, not a client case study.</p>
              <ol className={styles.steps}>
                {content.workflow.steps.map((step, stepIndex) => (
                  <li key={step.label}>
                    <span className={styles.marker} aria-hidden="true">{String(stepIndex + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className={styles.stepLabel}>{step.label}</h3>
                      <p className={styles.stepText}>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            {Visual && <div className={styles.visual}><Reveal delay={120}><Visual /></Reveal></div>}
          </div>
        </section>

        <section id="approach" className={`${styles.section} ${styles.grid}`} aria-labelledby="approach-title">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.label}>How we start</p>
              <h2 id="approach-title" className={styles.heading}>A focused first engagement.</h2>
            </div>
          </div>
          <div className={styles.engageGrid}>
            {engagement.map((item, itemIndex) => (
              <div key={item.title} className={styles.engageItem}>
                <h3><span>{String(itemIndex + 1).padStart(2, "0")}</span>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
            <div className={styles.engageItem}>
              <h3><span>04</span>How we would measure it</h3>
              <ul className={styles.measures}>
                {content.engagement.measures.map((measure) => <li key={measure}>{measure}</li>)}
              </ul>
            </div>
          </div>
          <div className={`${styles.notes} ${content.experience ? "" : styles.notesSingle}`}>
            <div className={styles.noteCard}>
              <p className={styles.label}>Systems and trust</p>
              <p>{content.trust}</p>
            </div>
            {content.experience && (
              <div className={styles.noteCard}>
                <p className={styles.label}>From our work</p>
                <p>{content.experience}</p>
              </div>
            )}
          </div>
          <div className={styles.method}>
            <p className={styles.label}>How every engagement runs</p>
            <ol>
              {engagementSteps.map((step, stepIndex) => (
                <li key={step.title}>
                  <span>{String(stepIndex + 1).padStart(2, "0")}</span>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="start" className={`${styles.section} ${styles.light} ${styles.invite}`} aria-labelledby="start-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="start-title" className={styles.invitePrompt}>{content.invitation.prompt}</h2>
          <p className={styles.inviteDetail}>{content.invitation.detail}</p>
          <div className={styles.actions}>
            <Link href="/get-started" className={styles.primary}>Get started <ArrowUpRight size={17} strokeWidth={1.5} /></Link>
            <Link href="/contact" className={styles.secondary}>Contact Pontian</Link>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href="/#industries"><ArrowLeft size={14} /> All industries</Link>
        <Link href={`/industries/${next.slug}`} className={styles.next}>Next: {next.name} <ArrowRight size={14} /></Link>
      </footer>
    </div>
  );
}
