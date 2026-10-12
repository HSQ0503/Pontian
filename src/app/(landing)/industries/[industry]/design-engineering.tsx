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
const summary = "We build tools for the repetitive parts of design work. Your engineers keep the decisions.";

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
  outcome: string;
  Visual: ComponentType;
};

const offerings: Offering[] = [
  {
    id: "create-the-first-model",
    label: "Create the first model",
    moment: "From a plan",
    headline: "Turn a plan into a first model.",
    body: "Give it a clean, dimensioned plan and it builds the walls and floor as an editable model. If the drawing leaves something out, it asks.",
    outcome: "Your team starts with a model to check and build on.",
    Visual: FirstModel,
  },
  {
    id: "check-how-designs-fit",
    label: "Check how designs fit",
    moment: "Across disciplines",
    headline: "Find where the designs collide.",
    body: "Structure and ventilation live in separate models. We can line them up and flag anywhere two things take the same space, with both elements named.",
    outcome: "Fix it in the model, before the design goes out.",
    Visual: DesignFit,
  },
  {
    id: "understand-revisions",
    label: "Understand revisions",
    moment: "When things change",
    headline: "See what else needs checking when a design changes.",
    body: "A supplier swaps in a bigger unit. We can trace what that touches and give each discipline its own question.",
    outcome: "Each discipline knows exactly what to check.",
    Visual: RevisionScope,
  },
  {
    id: "prepare-the-deliverables",
    label: "Prepare the deliverables",
    moment: "Before issue",
    headline: "Prepare drawings and schedules for review.",
    body: "We can draft schedules and sheets from your reviewed model and templates, then check them against the model before your reviewers see them.",
    outcome: "Less time assembling the set. More time reviewing the design.",
    Visual: Deliverables,
  },
];

const startingScopes = [
  "Walls and a floor from one plan",
  "One clash type, one set of models",
  "One equipment revision",
  "One document type",
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
                <p className={styles.offeringBody}>{offering.body}</p>
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
            <p className={styles.foundationBody}>The tools work from your templates, current requirements and approved decisions. Every output shows its sources and stays inside your project. Approval stays with your engineers.</p>
          </div>
        </section>

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div className={`${styles.column} ${styles.startGrid}`}>
            <div>
              <p className={styles.startLabel}>How we start</p>
              <h2 id="how-we-start-title" className={styles.startTitle}>Start with one repeatable task.</h2>
            </div>
            <div>
              <p className={styles.startBody}>Pick one job your team repeats. We test it on your real examples, against how you do it now.</p>
              <ol className={styles.startSteps}>
                {startingScopes.map((scope, scopeIndex) => (
                  <li key={scope}>
                    <span>{String(scopeIndex + 1).padStart(2, "0")}</span>
                    <p>{scope}</p>
                  </li>
                ))}
              </ol>
              <p className={styles.scopesNote}>Examples, not commitments.</p>
            </div>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.column}>
            <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
            <h2 id="talk-title" className={styles.closingTitle}>What would your team rather spend less time doing?</h2>
            <p className={styles.closingBody}>Bring one modeling chore, coordination headache or document job that slows you down.</p>
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
