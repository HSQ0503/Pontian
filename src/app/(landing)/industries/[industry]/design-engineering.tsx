import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { industries } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./design-engineering.module.css";
import { DesignFit, FirstModel, Deliverables, RevisionScope } from "./design-engineering-visuals";
import { BUILDING, WALL_HEIGHT, WALLS, boxFaces, isometric, toPoints } from "./design-engineering-model";
import { HeroDrawing, IndustryHero } from "./industry-hero";

const SLUG = "design-engineering";
const headline = "Move designs forward with less repetitive work.";
const summary =
  "We build AI tools around your team’s design process: creating initial models, finding potential conflicts, tracing the effects of revisions, and preparing documents for review.";

export const designEngineeringMetadata: Metadata = {
  title: "Design & Engineering",
  description: `${headline} ${summary}`,
  alternates: { canonical: `/industries/${SLUG}` },
  openGraph: { title: "Pontian for Design & Engineering", description: `${headline} ${summary}`, url: `/industries/${SLUG}`, siteName: "Pontian", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pontian" }] },
  twitter: { card: "summary_large_image", title: "Pontian for Design & Engineering", description: `${headline} ${summary}`, images: ["/og.png"] },
};

type Offering = {
  id: string;
  label: string;
  moment: string;
  headline: string;
  body: string;
  capabilities: string[];
  outcome: string;
  Visual: ComponentType;
};

const offerings: Offering[] = [
  {
    id: "create-the-first-model",
    label: "Create the first model",
    moment: "From a dimensioned plan",
    headline: "Turn a plan into a first model.",
    body: "We can build workflows that turn clearly defined plans and project inputs into an initial, editable building model. Your team reviews the interpretation and develops the design from there.",
    capabilities: ["Interpret supported plan elements", "Apply approved project templates", "Create a model your team can continue editing"],
    outcome: "Give the team a starting point they can inspect and develop.",
    Visual: FirstModel,
  },
  {
    id: "check-how-designs-fit",
    label: "Check how designs fit",
    moment: "Across discipline models",
    headline: "Find where designs don’t fit together.",
    body: "Different teams design different parts of the same building. We can connect their models and project requirements to help identify potential conflicts and bring the relevant evidence to the people who can resolve them.",
    capabilities: ["Compare discipline models", "Locate potential conflicts", "Bring the right references into the review"],
    outcome: "Give teams a specific conflict to resolve before releasing the design.",
    Visual: DesignFit,
  },
  {
    id: "understand-revisions",
    label: "Understand revisions",
    moment: "When an input changes",
    headline: "See what else needs checking when a design changes.",
    body: "A revised requirement can affect several disciplines. We can connect the change to related drawings, equipment information, and project decisions so each team can review its part.",
    capabilities: ["Compare the old and new information", "Identify related design dependencies", "Prepare a review with supporting sources"],
    outcome: "Help each discipline understand its part of the change.",
    Visual: RevisionScope,
  },
  {
    id: "prepare-the-deliverables",
    label: "Prepare the deliverables",
    moment: "From a reviewed model",
    headline: "Prepare drawings and schedules for review.",
    body: "We can automate repeatable document work using reviewed model information and your firm’s templates, then check the resulting package for missing or inconsistent information before your team reviews it.",
    capabilities: ["Create drafts from approved templates", "Check consistency with model information", "Prepare a package for professional review"],
    outcome: "Spend less time assembling the package and more time reviewing the design.",
    Visual: Deliverables,
  },
];

const foundation = [
  "Use the current project information",
  "Keep answers connected to their sources",
  "Respect project and team access",
  "Keep technical approval with the responsible professionals",
];

const startingScopes = [
  { area: "Modeling", text: "Create walls and a floor from a clearly dimensioned plan." },
  { area: "Coordination", text: "Check a defined set of models for a specific conflict type." },
  { area: "Revisions", text: "Trace an equipment revision across affected design references." },
  { area: "Documents", text: "Prepare one document type using an approved template." },
];

const HERO = isometric(26, 236, 118);
const DROP = 1.8;

// The page's own plan-to-model story, drawn as crisp linework.
function PlanToModelDrawing() {
  const order = ["W1", "W4", "W5", "W2", "W3"].map((id) => WALLS.find((wall) => wall.id === id) ?? WALLS[0]);
  const plan = (x: number, y: number) => HERO(x, y, -DROP);
  const outline = toPoints([plan(0, 0), plan(BUILDING.width, 0), plan(BUILDING.width, BUILDING.depth), plan(0, BUILDING.depth)]);
  const risers: [number, number][] = [[0, BUILDING.depth], [BUILDING.width, BUILDING.depth], [BUILDING.width, 0]];
  return (
    <svg viewBox="86 24 390 256" aria-hidden="true">
      <polygon points={outline} fill="none" stroke="#ffffff" strokeOpacity="0.32" strokeDasharray="4 5" />
      {WALLS.map((wall) => (
        <polygon key={wall.id} points={toPoints([plan(wall.x0, wall.y0), plan(wall.x1, wall.y0), plan(wall.x1, wall.y1), plan(wall.x0, wall.y1)])} fill={wall.id === "W5" ? "#fed603" : "#ffffff"} fillOpacity={wall.id === "W5" ? 0.75 : 0.22} />
      ))}
      {risers.map(([x, y]) => {
        const [x1, y1] = plan(x, y);
        const [x2, y2] = HERO(x, y, 0);
        return <line key={`${x}-${y}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeOpacity="0.28" strokeDasharray="2 4" />;
      })}
      {(() => {
        const slab = boxFaces(HERO, { x0: 0, x1: BUILDING.width, y0: 0, y1: BUILDING.depth, z0: -BUILDING.slab, z1: 0 });
        return <g fill="#080808" fillOpacity="0.5" stroke="#ffffff" strokeOpacity="0.38" strokeWidth="0.75"><polygon points={slab.south} /><polygon points={slab.east} /><polygon points={slab.top} /></g>;
      })()}
      {order.map((wall) => {
        const faces = boxFaces(HERO, { ...wall, z0: 0, z1: WALL_HEIGHT });
        const accent = wall.id === "W5";
        return (
          <g key={wall.id} fill={accent ? "#fed603" : "#080808"} fillOpacity={accent ? 0.16 : 0.42} stroke={accent ? "#fed603" : "#ffffff"} strokeOpacity={accent ? 0.9 : 0.5} strokeWidth="0.75" strokeLinejoin="round">
            <polygon points={faces.south} /><polygon points={faces.east} /><polygon points={faces.top} />
          </g>
        );
      })}
    </svg>
  );
}

export function DesignEngineeringPage() {
  const index = industries.findIndex((item) => item.slug === SLUG);
  const industry = industries[index];
  const next = industries[(index + 1) % industries.length];
  return (
    <div className={`${frontier.home} ${base.page}`}>
      <a className={frontier.skip} href="#industry-content">Skip to content</a>
      <FrontierHeader />
      <main id="industry-content">
        <IndustryHero
          industry={industry}
          index={index}
          headline={headline}
          summary={summary}
          links={offerings.map((offering) => ({ id: offering.id, label: offering.label, detail: offering.moment }))}
          media={<HeroDrawing><PlanToModelDrawing /></HeroDrawing>}
        />

        {offerings.map((offering, offeringIndex) => (
          <section key={offering.id} id={offering.id} className={styles.offering} aria-labelledby={`${offering.id}-title`}>
            <div className={styles.column}>
              <div className={styles.offeringHead}>
                <div>
                  <p className={styles.offeringLabel}>
                    <span className={styles.offeringIndex}>{String(offeringIndex + 1).padStart(2, "0")}</span>
                    {offering.label}
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
            </div>
          </section>
        ))}

        <section id="built-around-your-firm" className={styles.foundation} aria-labelledby="foundation-title">
          <div className={styles.column}>
            <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
            <h2 id="foundation-title" className={styles.foundationTitle}>Built around your firm’s way of working.</h2>
            <p className={styles.foundationBody}>The tools need to understand your templates, current requirements, and approved decisions. We connect that project context to the work, so the team can see which sources support an output and where information still needs confirmation.</p>
            <ul className={styles.foundationList}>
              {foundation.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
        </section>

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div className={`${styles.column} ${styles.startGrid}`}>
            <div>
              <p className={styles.startLabel}>How we start</p>
              <h2 id="how-we-start-title" className={styles.startTitle}>Start with one repeatable task.</h2>
            </div>
            <div>
              <p className={styles.startBody}>We choose a defined workflow with your team, gather representative inputs, and agree on what a useful result looks like. Then we test the output against your existing process before expanding its scope.</p>
              <p className={styles.scopesLabel}>Possible first engagements</p>
              <ol className={styles.startSteps}>
                {startingScopes.map((scope, scopeIndex) => (
                  <li key={scope.area}>
                    <span>{String(scopeIndex + 1).padStart(2, "0")}</span>
                    <strong>{scope.area}</strong>
                    <p>{scope.text}</p>
                  </li>
                ))}
              </ol>
              <p className={styles.scopesNote}>Starting scopes, not delivery commitments.</p>
            </div>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.column}>
            <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
            <h2 id="talk-title" className={styles.closingTitle}>What would your team rather spend less time doing?</h2>
            <p className={styles.closingBody}>Tell us about a repetitive modeling task, a difficult coordination problem, or a document workflow that slows down delivery.</p>
            <Link href="/get-started" className={styles.closingButton}>Talk through a workflow <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <footer className={base.footer}>
        <Link href="/#industries"><ArrowLeft size={14} aria-hidden="true" /> All industries</Link>
        <Link href={`/industries/${next.slug}`}>Next: {next.name} <ArrowRight size={14} aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
