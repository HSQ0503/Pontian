import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Industry } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./manufacturing.module.css";
import { InspectProduct, InvestigateProblem, PlanProduction, TestChange } from "./manufacturing-visuals";

export const manufacturingHeadline = "Help your factory understand problems and test better ways to work.";
export const manufacturingSummary =
  "We develop AI-assisted tools that inspect products, investigate equipment issues, plan production, and explore changes before your team commits to them.";

type Offering = {
  id: string;
  label: string;
  moment: string;
  summary: string;
  knowledge: string;
  headline: string;
  body: string;
  capabilities: string[];
  outcome: string;
  Visual: ComponentType;
};

const offerings: Offering[] = [
  {
    id: "inspect-the-product",
    label: "Inspect the product",
    moment: "At quality checks",
    summary: "Inspect what is being made.",
    knowledge: "Approved requirements and reference examples",
    headline: "Teach the system what needs checking.",
    body: "We can develop inspection workflows that use approved examples, product requirements, and camera images to flag visible differences. Start with a defined product and defect type, then test performance on real production samples.",
    capabilities: ["Use product-specific reference information", "Flag defined visible differences", "Review findings against quality criteria"],
    outcome: "Give the quality team a specific finding to inspect.",
    Visual: InspectProduct,
  },
  {
    id: "plan-the-production",
    label: "Plan the production",
    moment: "When orders change",
    summary: "Plan how work moves through the factory.",
    knowledge: "Orders, materials, equipment, and setup requirements",
    headline: "Turn changing orders into a workable production plan.",
    body: "We can connect orders, materials, machine availability, and setup requirements to help your team compare production sequences. AI helps interpret the request; scheduling tools evaluate the constraints.",
    capabilities: ["Interpret production requests", "Account for materials and equipment", "Compare consequences before rescheduling"],
    outcome: "See what a new priority means for the rest of the work.",
    Visual: PlanProduction,
  },
  {
    id: "investigate-the-problem",
    label: "Investigate the problem",
    moment: "When equipment behaves differently",
    summary: "Investigate equipment problems.",
    knowledge: "Equipment documentation and operating history",
    headline: "Bring the evidence together when a machine behaves differently.",
    body: "We can build assistants that examine operating signals alongside equipment documentation, photographs, alarms, and maintenance history, helping technicians investigate possible causes with the supporting evidence in view.",
    capabilities: ["Connect signals, records, and documentation", "Investigate possible explanations", "Keep evidence and uncertainty visible"],
    outcome: "Help technicians decide what to investigate next.",
    Visual: InvestigateProblem,
  },
  {
    id: "test-the-change",
    label: "Test the change",
    moment: "Before changing the line",
    summary: "Test proposed improvements.",
    knowledge: "Process times, layout, and stated assumptions",
    headline: "Test the idea before changing the line.",
    body: "We can connect an AI assistant to a validated production simulation, helping engineers turn a question into an experiment and compare the results under explicit assumptions.",
    capabilities: ["Turn a question into a defined experiment", "Compare production configurations", "Explain results and remaining constraints"],
    outcome: "Understand what an investment might change before committing to it.",
    Visual: TestChange,
  },
];

const roles = [
  { title: "AI", text: "Interprets documents, images, questions, and operating context." },
  { title: "Scheduling and optimization tools", text: "Evaluate production sequences against the constraints." },
  { title: "Simulation", text: "Calculates modeled scenarios under stated assumptions." },
  { title: "Your team", text: "Evaluates findings and approves operational changes." },
];

const startingScopes = [
  "One product and a defined visual defect.",
  "One production cell and its scheduling constraints.",
  "One equipment family and its maintenance records.",
  "One process change to evaluate through simulation.",
];

export function ManufacturingPage({ industry, index, next }: { industry: Industry; index: number; next: Industry }) {
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
            <h1 id="industry-title" className={styles.headline}>{manufacturingHeadline}</h1>
            <p className={styles.heroLead}>{manufacturingSummary}</p>
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
          <h2 id="recap-title" className={styles.recapTitle}>One production cell, followed from the product to the next improvement.</h2>
          <ol className={styles.recapList}>
            {offerings.map((offering) => (
              <li key={offering.id}>
                <span className={styles.recapMoment}>{offering.moment}</span>
                <p>{offering.summary}</p>
                <span className={styles.recapKnowledge}>Draws on: {offering.knowledge.toLowerCase()}</span>
                <a href={`#${offering.id}`}>{offering.label} <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" /></a>
              </li>
            ))}
          </ol>
          <p className={styles.shared}>The shared project knowledge supplies approved requirements, equipment context, and operating history across these workflows.</p>
          <ul className={styles.roles}>
            {roles.map((role) => <li key={role.title}><strong>{role.title}</strong><span>{role.text}</span></li>)}
          </ul>
        </section>

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div>
            <p className={styles.startLabel}>How we start</p>
            <h2 id="how-we-start-title" className={styles.startTitle}>One process. One question. A&nbsp;testable result.</h2>
          </div>
          <div>
            <p className={styles.startBody}>We work with your operators and engineers to choose a focused problem, establish the necessary inputs, and test the workflow against representative examples before expanding it.</p>
            <p className={styles.startLabel}>Possible starting scopes</p>
            <ol className={styles.startSteps}>
              {startingScopes.map((scope, scopeIndex) => (
                <li key={scope}>
                  <span>{String(scopeIndex + 1).padStart(2, "0")}</span>
                  <p>{scope}</p>
                </li>
              ))}
            </ol>
            <p className={styles.startNote}>Your team helps define what a useful and reliable result looks like.</p>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>What would you like your factory to understand better?</h2>
          <p className={styles.closingBody}>A recurring defect, a difficult production decision, an equipment problem, or a proposed investment is a useful place to start.</p>
          <Link href="/get-started" className={styles.closingButton}>Talk through a process <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className={base.footer}>
        <Link href="/#industries"><ArrowLeft size={14} /> All industries</Link>
        <Link href={`/industries/${next.slug}`}>Next: {next.name} <ArrowRight size={14} /></Link>
      </footer>
    </div>
  );
}
