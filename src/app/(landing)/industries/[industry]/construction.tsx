import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Industry } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./construction.module.css";
import { BidCheck, ChangeImpact, SiteCheck, WayForward } from "./construction-visuals";
import { HeroPhoto, IndustryHero } from "./industry-hero";

export const constructionHeadline = "Catch costly surprises before they reach the jobsite.";
export const constructionSummary =
  "We build AI tools that read your drawings, quotes, schedules and site photos, and show what doesn’t line up.";

type Offering = {
  id: string;
  label: string;
  moment: string;
  headline: string;
  body: string;
  outcome: string;
  Visual: ComponentType;
};

const offerings: Offering[] = [
  {
    id: "check-the-bid",
    label: "Check the bid",
    moment: "Before you price",
    headline: "Find what the bid missed.",
    body: "A door left off a sub’s quote is a door you pay for later. We flag it against the drawing for your estimator.",
    outcome: "Know what to check before you commit to a price.",
    Visual: BidCheck,
  },
  {
    id: "understand-the-change",
    label: "Understand the change",
    moment: "When the client changes it",
    headline: "See what a change affects.",
    body: "Two extra rooms also land in the quote, the board order and the electrician’s week.",
    outcome: "Agree to the change knowing what it touches.",
    Visual: ChangeImpact,
  },
  {
    id: "check-whats-built",
    label: "Check what’s built",
    moment: "While it goes up",
    headline: "Compare the plan with the site.",
    body: "We match your photos and scans to the model while the walls are still open.",
    outcome: "Give the site team a specific place to look.",
    Visual: SiteCheck,
  },
  {
    id: "find-a-way-forward",
    label: "Find a way forward",
    moment: "When a delivery slips",
    headline: "Test the next move before moving the crew.",
    body: "The flooring’s late. Your planner can try the work that doesn’t need it before anyone moves.",
    outcome: "Weigh the tradeoffs before you change the plan.",
    Visual: WayForward,
  },
];

const startSteps = [
  { title: "Pick one problem", text: "A bid, a change, a site check or a schedule, on one project." },
  { title: "Gather what it uses", text: "The drawings, quotes, orders or captures behind it." },
  { title: "Run it alongside", text: "Next to how you work today. Your team decides if it helps." },
];

export function ConstructionPage({ industry, index, next }: { industry: Industry; index: number; next: Industry }) {
  return (
    <div className={`${frontier.home} ${base.page}`}>
      <a className={frontier.skip} href="#industry-content">Skip to content</a>
      <FrontierHeader />
      <main id="industry-content">
        <IndustryHero
          industry={industry}
          index={index}
          headline={constructionHeadline}
          summary={constructionSummary}
          links={offerings.map((offering) => ({ id: offering.id, label: offering.label, detail: offering.moment }))}
          media={<HeroPhoto src={industry.image} alt={industry.alt} position="62% 45%" />}
        />

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
              <p className={styles.offeringBody}>{offering.body}</p>
            </div>
            <offering.Visual />
            <p className={styles.outcomeLine}>{offering.outcome}</p>
          </section>
        ))}

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div>
            <p className={styles.startLabel}>How we start</p>
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with one project and one problem.</h2>
          </div>
          <ol className={styles.startSteps}>
            {startSteps.map((step, stepIndex) => (
              <li key={step.title}>
                <span>{String(stepIndex + 1).padStart(2, "0")}</span>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>Which problem is costing your team time or money?</h2>
          <p className={styles.closingBody}>Bring us the one that keeps coming back.</p>
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
