import type { ComponentType } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { industries } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./property-services.module.css";
import { EquipTheCrew, PlanTheNextVisit, ReviewTheResult, ScopeTheWork } from "./property-services-visuals";

const SLUG = "property-services";
const headline = "Help every crew arrive prepared.";
const summary =
  "We connect property history, approved work, and field observations so your team can prepare estimates, answer job questions, document service, and plan the next visit.";
const socialTitle = "Pontian for Property Services";

export const propertyServicesMetadata: Metadata = {
  title: "Property Services",
  description: `${headline} ${summary}`,
  alternates: { canonical: `/industries/${SLUG}` },
  openGraph: { title: socialTitle, description: `${headline} ${summary}`, url: `/industries/${SLUG}`, siteName: "Pontian", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pontian" }] },
  twitter: { card: "summary_large_image", title: socialTitle, description: `${headline} ${summary}`, images: ["/og.png"] },
};

type Offering = {
  id: string;
  label: string;
  moment: string;
  summary: string;
  headline: string;
  body: string;
  capabilities: string[];
  outcome: string;
  Visual: ComponentType;
};

const offerings: Offering[] = [
  {
    id: "scope-the-work",
    label: "Scope the work",
    moment: "At the walkthrough",
    summary: "The owner's walkthrough becomes a reviewed estimate.",
    headline: "Turn a walkthrough into a clear plan for the job.",
    body: "We can bring together site photos, spoken notes, and your service catalog to prepare a draft scope and estimate, with exclusions and unanswered questions kept visible.",
    capabilities: ["Capture photos and spoken observations", "Prepare work items and exclusions", "Keep open questions out of the approved scope"],
    outcome: "Make the promised work clear before the crew arrives.",
    Visual: ScopeTheWork,
  },
  {
    id: "equip-the-crew",
    label: "Equip the crew",
    moment: "On the day of service",
    summary: "The crew receives the accepted scope and the property's history.",
    headline: "Give the crew the property's context.",
    body: "We can connect the accepted estimate, property notes, previous visits, and reference photos so assigned crews can find useful answers without repeatedly calling the owner.",
    capabilities: ["See the approved work", "Find property-specific instructions", "Get answers with supporting records"],
    outcome: "Keep routine job questions from depending on one person's memory.",
    Visual: EquipTheCrew,
  },
  {
    id: "review-the-result",
    label: "Review the result",
    moment: "After the visit",
    summary: "The supervisor reviews the evidence against the work promised.",
    headline: "Connect the evidence to the work promised.",
    body: "We can organize completion photos and crew notes against the approved tasks, helping supervisors identify missing documentation and prepare a clear service summary.",
    capabilities: ["Match photos to approved tasks", "Identify missing documentation", "Prepare a reviewed service record"],
    outcome: "Make the handoff from crew to office to customer easier to follow.",
    Visual: ReviewTheResult,
  },
  {
    id: "plan-the-next-visit",
    label: "Plan the next visit",
    moment: "Before the next visit",
    summary: "The next visit starts with that knowledge already available.",
    headline: "Carry the property's history into the next visit.",
    body: "We can connect agreed service intervals, previous work, customer preferences, and crew availability to help your team prepare the next visit and review how it fits into the schedule.",
    capabilities: ["Use agreed service intervals", "Consider travel and crew availability", "Bring previous instructions into the next job"],
    outcome: "Make repeat service easier to organize and deliver.",
    Visual: PlanTheNextVisit,
  },
];

const startingScopes = [
  "Walkthrough notes into draft estimates.",
  "Property briefings for assigned crews.",
  "Completion-photo review for defined services.",
  "Recurring-visit planning for one crew.",
];

export function PropertyServicesPage() {
  const index = industries.findIndex((item) => item.slug === SLUG);
  const industry = industries[index];
  const next = industries[(index + 1) % industries.length];
  return (
    <div className={`${frontier.home} ${base.page}`}>
      <a className={frontier.skip} href="#industry-content">Skip to content</a>
      <FrontierHeader />
      <main id="industry-content">
        <section className={styles.hero} aria-labelledby="industry-title">
          <div className={base.photoFrame}>
            <Image src={industry.image} alt={industry.alt} fill preload sizes="100vw" className={base.photo} style={industry.heroPosition ? { objectPosition: industry.heroPosition } : undefined} />
          </div>
          <div className={base.shade} />
          <div className={styles.heroCopy}>
            <Link href="/#industries" className={base.back}><ArrowLeft size={14} /> Industries / {String(index + 1).padStart(2, "0")} {industry.name}</Link>
            <h1 id="industry-title" className={styles.headline}>{headline}</h1>
            <p className={styles.heroLead}>{summary}</p>
            <nav className={styles.heroNav} aria-label="What we can build">
              {offerings.map((offering, offeringIndex) => (
                <a key={offering.id} href={`#${offering.id}`}>
                  <span className={styles.navIndex}>{String(offeringIndex + 1).padStart(2, "0")}</span>
                  <span className={styles.navLabel}>{offering.label}</span>
                  <span className={styles.navMoment}>{offering.moment}</span>
                  <ArrowDown size={15} strokeWidth={1.4} aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>
        </section>

        {offerings.map((offering, offeringIndex) => (
          <section key={offering.id} id={offering.id} className={styles.offering} aria-labelledby={`${offering.id}-title`}>
            <div className={styles.offeringHead}>
              <div>
                <p className={styles.offeringLabel}>
                  <span className={styles.offeringIndex}>{String(offeringIndex + 1).padStart(2, "0")}</span>
                  {offering.label}
                  <span className={styles.offeringMoment}>{offering.moment}</span>
                </p>
                <h2 id={`${offering.id}-title`} className={styles.offeringTitle}>{offering.headline}</h2>
              </div>
              <div>
                <p className={styles.offeringBody}>{offering.body}</p>
                <ul className={styles.capabilities}>
                  {offering.capabilities.map((capability) => <li key={capability}>{capability}</li>)}
                </ul>
              </div>
            </div>
            <offering.Visual />
            <p className={styles.outcomeLine}>{offering.outcome}</p>
          </section>
        ))}

        <section className={styles.recap} aria-labelledby="recap-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="recap-title" className={styles.recapTitle}>One property record, from the first walkthrough to the next visit.</h2>
          <ol className={styles.recapList}>
            {offerings.map((offering) => (
              <li key={offering.id}>
                <span className={styles.recapMoment}>{offering.moment}</span>
                <p>{offering.summary}</p>
                <a href={`#${offering.id}`}>{offering.label} <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" /></a>
              </li>
            ))}
          </ol>
        </section>

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div>
            <p className={styles.startLabel}>How we start</p>
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with the handoff that causes the most friction.</h2>
          </div>
          <div>
            <p className={styles.startBody}>We work with your team to understand how a job moves from inquiry to completion, choose one recurring problem, and test a focused workflow using representative jobs.</p>
            <p className={styles.scopesLabel}>Possible starting scopes</p>
            <ol className={styles.startSteps}>
              {startingScopes.map((scope, scopeIndex) => (
                <li key={scope}>
                  <span>{String(scopeIndex + 1).padStart(2, "0")}</span>
                  <p>{scope}</p>
                </li>
              ))}
            </ol>
            <dl className={styles.maturity}>
              <div>
                <dt>Field-service workflows we have implemented</dt>
                <dd>Estimates, scheduling, crew workflows, job photos, payments, and recurring service.</dd>
              </div>
              <div>
                <dt>Proposed extensions to develop and validate</dt>
                <dd>Photo-assisted scoping, property-aware answers, visual evidence review, and optimized scheduling.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>What does your team keep having to explain twice?</h2>
          <p className={styles.closingBody}>Tell us about the property details, crew questions, or follow-ups that repeatedly come back to you.</p>
          <Link href="/get-started" className={styles.closingButton}>Talk through your service operation <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className={base.footer}>
        <Link href="/#industries"><ArrowLeft size={14} /> All industries</Link>
        <Link href={`/industries/${next.slug}`}>Next: {next.name} <ArrowRight size={14} /></Link>
      </footer>
    </div>
  );
}
