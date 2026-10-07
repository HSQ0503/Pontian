import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Industry } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./construction.module.css";
import { BidCheck, ChangeImpact, SiteCheck, WayForward } from "./construction-visuals";

export const constructionHeadline = "Catch costly surprises before they reach the jobsite.";
export const constructionSummary =
  "We build AI tools that help construction teams check bids, understand changes, compare plans with site conditions, and explore ways to keep work moving.";

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
    id: "check-the-bid",
    label: "Check the bid",
    moment: "Before committing",
    summary: "Check whether the bid covers the work.",
    headline: "Find what the bid missed.",
    body: "A detail missing from a quote can become your cost later. We can build tools that compare drawings, specifications, and subcontractor quotes, bringing possible gaps to your estimator's attention before the bid goes out.",
    capabilities: ["Compare drawings and quotes", "Flag missing or conflicting scope", "Prepare questions for the estimator"],
    outcome: "Know what needs checking before you commit to a price.",
    Visual: BidCheck,
  },
  {
    id: "understand-the-change",
    label: "Understand the change",
    moment: "When requirements change",
    summary: "Understand what else may need to change.",
    headline: "See what a change affects.",
    body: "A revised plan can change more than the drawing. We can connect the revision to quoted work, material orders, and scheduled activities so your team can review the consequences before proceeding.",
    capabilities: ["Compare revisions", "Trace affected work and purchases", "Prepare supporting change documentation"],
    outcome: "Make the consequences clear before agreeing to the change.",
    Visual: ChangeImpact,
  },
  {
    id: "check-whats-built",
    label: "Check what's built",
    moment: "During construction",
    summary: "Compare the available site evidence with the plan.",
    headline: "Compare the plan with the site.",
    body: "We can connect site photos or scans with project drawings and models, helping your team review visible progress and investigate possible differences while the work is still accessible.",
    capabilities: ["Compare planned and visible work", "Locate areas that need checking", "Keep visual evidence with the issue"],
    outcome: "Give the site team a specific place to look.",
    Visual: SiteCheck,
  },
  {
    id: "find-a-way-forward",
    label: "Find a way forward",
    moment: "When work is disrupted",
    summary: "Evaluate the next feasible move.",
    headline: "Test the next move before moving the crew.",
    body: "When a delivery slips or a crew becomes unavailable, we can help your team compare alternative work sequences using the project's dependencies, resources, and constraints.",
    capabilities: ["Explore alternative sequences", "Check crew and equipment constraints", "Compare recovery options"],
    outcome: "Understand the tradeoffs before changing the plan.",
    Visual: WayForward,
  },
];

const startSteps = [
  { title: "Choose one task", text: "A specific bid, change, site check, or schedule problem on one project." },
  { title: "Map its information", text: "The drawings, quotes, orders, schedules, or captures the task depends on." },
  { title: "Test it against today", text: "Run the workflow beside your current process and let your team judge the output." },
];

export function ConstructionPage({ industry, index, next }: { industry: Industry; index: number; next: Industry }) {
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
            <h1 id="industry-title" className={styles.headline}>{constructionHeadline}</h1>
            <p className={styles.heroLead}>{constructionSummary}</p>
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
          <h2 id="recap-title" className={styles.recapTitle}>One way of working, from the first price to the final finishes.</h2>
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
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with one project and one problem.</h2>
          </div>
          <div>
            <p className={styles.startBody}>We work with your team to choose a specific task, understand the information it depends on, and test a focused workflow against your existing process. Your estimators, planners, and site leads help judge whether the output is useful.</p>
            <ol className={styles.startSteps}>
              {startSteps.map((step, stepIndex) => (
                <li key={step.title}>
                  <span>{String(stepIndex + 1).padStart(2, "0")}</span>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>Which problem is costing your team time or money?</h2>
          <p className={styles.closingBody}>A difficult bid, a changing scope, uncertain site progress, or a disrupted schedule is a useful place to start.</p>
          <Link href="/get-started" className={styles.closingButton}>Talk through a project <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className={base.footer}>
        <Link href="/#industries"><ArrowLeft size={14} /> All industries</Link>
        <Link href={`/industries/${next.slug}`}>Next: {next.name} <ArrowRight size={14} /></Link>
      </footer>
    </div>
  );
}
