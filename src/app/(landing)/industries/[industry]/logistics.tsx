import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { industries } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./logistics.module.css";
import { operation, vehicles } from "./logistics-data";
import { DeliveryPlan, QuotePreparation } from "./logistics-visuals";
import { DisruptionRecovery } from "./logistics-recovery";
import { LoadPlan } from "./logistics-load";
import { LoadIllustration } from "./logistics-illustration";
import { HeroDrawing, IndustryHero } from "./industry-hero";

const SLUG = "logistics";
const headline = "Make every shipment work better.";
const summary =
  "We build tools for the calls your dispatch desk makes every day, shaped around how your trucks actually run.";

export const logisticsMetadata: Metadata = {
  title: "Logistics",
  description: `${headline} ${summary}`,
  alternates: { canonical: `/industries/${SLUG}` },
  openGraph: { title: "Pontian for Logistics", description: `${headline} ${summary}`, url: `/industries/${SLUG}`, siteName: "Pontian", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pontian" }] },
  twitter: { card: "summary_large_image", title: "Pontian for Logistics", description: `${headline} ${summary}`, images: ["/og.png"] },
};

type Offering = {
  id: string;
  label: string;
  audience: string;
  headline: string;
  body: string;
  outcome: string;
  note: string;
  Visual: ComponentType;
};

const offerings: Offering[] = [
  {
    id: "plan-the-deliveries",
    label: "Plan the deliveries",
    audience: "For fleet operators",
    headline: "Give every delivery a workable place in the day.",
    body: "We connect your orders, delivery windows, truck sizes and driver hours into a plan your dispatcher can check. When a new job comes in, you see which truck can take it and what it would push late.",
    outcome: "See how the day fits together before sending vehicles out.",
    note: "Drive times here are fixed examples. Real routing needs your vehicle limits, driver rules and stop times built in.",
    Visual: DeliveryPlan,
  },
  {
    id: "plan-the-load",
    label: "Plan the load",
    audience: "For fleet operators",
    headline: "See how the load fits before loading starts.",
    body: "We turn pallet sizes, weights, stacking rules and drop order into a loading plan. Your warehouse sees whether it fits, and whether each drop can come off when it’s due.",
    outcome: "Give the loading team a plan they can inspect before moving freight.",
    note: "An illustration, not a certified safe-loading plan. It doesn’t check weight distribution or securing, and we’d build it on proven packing tools rather than an engine of our own.",
    Visual: LoadPlan,
  },
  {
    id: "handle-the-disruption",
    label: "Handle the disruption",
    audience: "For fleet operators and brokers",
    headline: "Find the next workable move.",
    body: "When a truck is off the road, dispatch sees which deliveries it had and where they could go. Some fit. The ones that don’t get flagged, so nobody assumes they’re covered.",
    outcome: "Give dispatch options and consequences in the same place.",
    note: "For brokers, the other options are other carriers; the rest works the same. It starts from a recorded status update and doesn’t predict breakdowns or track trucks live.",
    Visual: DisruptionRecovery,
  },
  {
    id: "prepare-the-quote",
    label: "Prepare the quote",
    audience: "For fleet operators and brokers",
    headline: "Turn a shipment request into a quote you can explain.",
    body: "We pull the details out of the email, flag what’s missing, and price it from your rate card. Every line says which rule it came from. It’s the same job that lands on Vehicle B above.",
    outcome: "Respond with a price your team can stand behind.",
    note: "For brokers, the price starts from the carrier’s cost plus your margin, which is a separate calculation. This is an example rate card, not market rates, and not a profit figure.",
    Visual: QuotePreparation,
  },
];

const startingScopes = [
  "Replay a few past dispatch days.",
  "Plan loads for one truck and one cargo type.",
  "Rehearse one disruption you see often.",
  "Quote one kind of shipment, with review.",
];

export function LogisticsPage({ index }: { index: number }) {
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
          links={offerings.map((offering) => ({ id: offering.id, label: offering.label, detail: offering.audience }))}
          media={<HeroDrawing><LoadIllustration /></HeroDrawing>}
        />

        <section id="example-operation" className={styles.operation} aria-label="About the examples">
          <p>
            Every example uses {operation.name}, a made-up carrier with one depot and two trucks. {vehicles.A.name} takes {vehicles.A.palletSpaces} pallets, {vehicles.B.name} takes {vehicles.B.palletSpaces}.
          </p>
          <p>Fleet operators run their own trucks. Brokers hire carriers. Each section says which it’s for.</p>
        </section>

        {offerings.map((offering, offeringIndex) => (
          <section key={offering.id} id={offering.id} className={styles.offering} aria-labelledby={`${offering.id}-title`}>
            <div className={styles.offeringHead}>
              <div>
                <p className={styles.offeringLabel}>
                  <span className={styles.offeringIndex}>{String(offeringIndex + 1).padStart(2, "0")}</span>
                  {offering.label}
                  <span className={styles.offeringAudience}>{offering.audience}</span>
                </p>
                <h2 id={`${offering.id}-title`} className={styles.offeringTitle}>{offering.headline}</h2>
              </div>
              <p className={styles.offeringBody}>{offering.body}</p>
            </div>
            <offering.Visual />
            <p className={styles.outcomeLine}>{offering.outcome}</p>
            <p className={styles.limits}>{offering.note}</p>
          </section>
        ))}

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div>
            <p className={styles.sectionLabel}>How we start</p>
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with one part of the operation.</h2>
          </div>
          <div>
            <p className={styles.startBody}>We pick one workflow with your team and test it on real days before going further.</p>
            <ol className={styles.scopes}>
              {startingScopes.map((scope, scopeIndex) => (
                <li key={scope}><span>{String(scopeIndex + 1).padStart(2, "0")}</span>{scope}</li>
              ))}
            </ol>
            <p className={styles.scopeNote}>Pilot scopes, not promises about delivery or savings.</p>
            <p className={styles.startJudge}>Your team helps judge whether the output is workable.</p>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>Where does your operation lose time, space, or margin?</h2>
          <p className={styles.closingBody}>Tell us about the deliveries, loads, breakdowns or quotes that keep landing on your desk.</p>
          <Link href="/get-started" className={styles.closingButton}>Talk through your operation <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className={base.footer}>
        <Link href="/#industries"><ArrowLeft size={14} /> All industries</Link>
        <Link href={`/industries/${next.slug}`}>Next: {next.name} <ArrowRight size={14} /></Link>
      </footer>
    </div>
  );
}
