import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Industry } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./manufacturing.module.css";
import { CellIllustration } from "./manufacturing-illustration";
import { HeroDrawing, IndustryHero } from "./industry-hero";
import { InspectProduct, InvestigateProblem, PlanProduction, TestChange } from "./manufacturing-visuals";

export const manufacturingHeadline = "Help your factory understand problems and test better ways to work.";
export const manufacturingSummary = "We build AI tools that spot defects, fit rush orders into the schedule, help chase down machine faults, and let you try a line change before you pay for it.";

type Offering = { id: string; label: string; moment: string; headline: string; body: string; outcome: string; Visual: ComponentType };

const offerings: Offering[] = [
  {
    id: "inspect-the-product",
    label: "Inspect the product",
    moment: "At quality checks",
    headline: "Teach the system what needs checking.",
    body: "Show it approved parts and the spec. It flags what looks different, and your quality team decides whether it matters. We start with one product and one defect, tested on your own parts.",
    outcome: "Give the quality team a specific finding to inspect.",
    Visual: InspectProduct,
  },
  {
    id: "plan-the-production",
    label: "Plan the production",
    moment: "When orders change",
    headline: "Turn changing orders into a workable plan.",
    body: "Your planner asks in plain words. The AI reads the request, and a scheduling tool checks it against materials, machines and setups. The planner still picks.",
    outcome: "See what a rush order pushes back.",
    Visual: PlanProduction,
  },
  {
    id: "investigate-the-problem",
    label: "Investigate the problem",
    moment: "When a machine acts up",
    headline: "When a machine acts up, get the evidence in one place.",
    body: "The assistant lines up sensor data, the manual and past work orders for the same machine over the same days. It suggests what might be going on and what would settle it. Your technician makes the call.",
    outcome: "Help technicians decide what to investigate next.",
    Visual: InvestigateProblem,
  },
  {
    id: "test-the-change",
    label: "Test the change",
    moment: "Before you buy",
    headline: "Test the idea before changing the line.",
    body: "Ask a what-if. The assistant turns it into a run on a simulation of your line, writes down every assumption, and shows you where parts pile up.",
    outcome: "Know what the money buys before you spend it.",
    Visual: TestChange,
  },
];

export function ManufacturingPage({ industry, index, next }: { industry: Industry; index: number; next: Industry }) {
  return (
    <div className={`${frontier.home} ${base.page}`}>
      <a className={frontier.skip} href="#industry-content">Skip to content</a>
      <FrontierHeader />
      <main id="industry-content">
        <IndustryHero
          industry={industry}
          index={index}
          headline={manufacturingHeadline}
          summary={manufacturingSummary}
          links={offerings.map((offering) => ({ id: offering.id, label: offering.label, detail: offering.moment }))}
          media={<HeroDrawing><CellIllustration /></HeroDrawing>}
        />

        {offerings.map((offering, offeringIndex) => (
          <section key={offering.id} id={offering.id} className={styles.offering} aria-labelledby={`${offering.id}-title`}>
            <div className={styles.offeringInner}>
              <div className={styles.offeringHead}>
                <div>
                  <p className={styles.offeringLabel}>
                    <span className={styles.offeringIndex}>{String(offeringIndex + 1).padStart(2, "0")}</span>
                    {offering.label}
                  </p>
                  <h2 id={`${offering.id}-title`} className={styles.offeringTitle}>{offering.headline}</h2>
                </div>
                <p className={styles.offeringBody}>{offering.body}</p>
              </div>
              <offering.Visual />
              <p className={styles.outcomeLine}>{offering.outcome}</p>
            </div>
          </section>
        ))}

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div className={styles.startInner}>
            <div>
              <p className={styles.startLabel}>How we start</p>
              <h2 id="how-we-start-title" className={styles.startTitle}>One process. One question. A&nbsp;testable result.</h2>
            </div>
            <div>
              <p className={styles.startBody}>We sit down with your operators and engineers and pick one problem. A recurring defect, one cell’s schedule, one machine family or a change you’re weighing all work. Then we test the tool on your own examples before it goes anywhere else.</p>
              <p className={styles.startNote}>You decide what counts as good enough.</p>
            </div>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.sectionInner}>
            <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
            <h2 id="talk-title" className={styles.closingTitle}>What would you like your factory to understand better?</h2>
            <p className={styles.closingBody}>A defect that keeps coming back, a schedule that won’t fit, a machine acting strange. Any of them is a good place to start.</p>
            <Link href="/get-started" className={styles.closingButton}>Talk through a process <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <footer className={base.footer}>
        <Link href="/#industries"><ArrowLeft size={14} strokeWidth={1.5} /> All industries</Link>
        <Link href={`/industries/${next.slug}`}>Next: {next.name} <ArrowRight size={14} strokeWidth={1.5} /></Link>
      </footer>
    </div>
  );
}
