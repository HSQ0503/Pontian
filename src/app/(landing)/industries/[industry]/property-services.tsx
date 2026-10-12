import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { industries } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./property-services.module.css";
import { EquipTheCrew, PlanTheNextVisit, ReviewTheResult, ScopeTheWork } from "./property-services-visuals";
import { HeroPhoto, IndustryHero } from "./industry-hero";
import heroPhoto from "../../../../../public/pontian/property-services-hero.webp";

const SLUG = "property-services";
const headline = "Help every crew arrive prepared.";
const summary =
  "What you learn on a walkthrough usually lives in one person’s head. We put it on the job record, so nobody has to ring you to find it.";
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
  headline: string;
  body: string;
  outcome: string;
  Visual: ComponentType;
};

const offerings: Offering[] = [
  {
    id: "scope-the-work",
    label: "Scope the work",
    moment: "At the walkthrough",
    headline: "Turn a walkthrough into a clear plan for the job.",
    body: "You walk the property, take a few photos and say what you want done. We turn that into a draft scope your estimator checks and prices. What’s excluded, and what’s still a question, stays written down.",
    outcome: "Make the promised work clear before the crew arrives.",
    Visual: ScopeTheWork,
  },
  {
    id: "equip-the-crew",
    label: "Equip the crew",
    moment: "On the day",
    headline: "Give the crew the property’s context.",
    body: "Your crew gets the approved job, the gate, the fence warning and last visit’s notes on their phone. When they ask something, the answer comes with the record behind it.",
    outcome: "Keep routine job questions from depending on one person’s memory.",
    Visual: EquipTheCrew,
  },
  {
    id: "review-the-result",
    label: "Review the result",
    moment: "After the visit",
    headline: "Connect the evidence to the work promised.",
    body: "Crew photos land on the task they belong to. Your supervisor sees straight away that the patio has a before shot and no after shot.",
    outcome: "Make the handoff from crew to office to customer easier to follow.",
    Visual: ReviewTheResult,
  },
  {
    id: "plan-the-next-visit",
    label: "Plan the next visit",
    moment: "Before the next one",
    headline: "Carry the property’s history into the next visit.",
    body: "The customer agreed to a visit every six months. When it’s due, we draft a day around it with nearby jobs. The office approves it before anything is booked.",
    outcome: "Make repeat service easier to organize and deliver.",
    Visual: PlanTheNextVisit,
  },
];

const startingScopes = [
  "Walkthrough notes into draft estimates",
  "Property briefings for your crews",
  "Photo checks for one service",
  "Repeat visits for one crew",
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
        <IndustryHero
          industry={industry}
          index={index}
          headline={headline}
          summary={summary}
          links={offerings.map((offering) => ({ id: offering.id, label: offering.label, detail: offering.moment }))}
          media={<HeroPhoto src={heroPhoto} alt={industry.alt} position="50% 50%" />}
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
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with the handoff that causes the most friction.</h2>
          </div>
          <div>
            <p className={styles.startBody}>Tell us which handoff keeps landing back on you. We map it with your team and test a fix on a handful of real jobs.</p>
            <p className={styles.scopesLabel}>Good places to start</p>
            <ol className={styles.startSteps}>
              {startingScopes.map((scope, scopeIndex) => (
                <li key={scope}>
                  <span>{String(scopeIndex + 1).padStart(2, "0")}</span>
                  <p>{scope}</p>
                </li>
              ))}
            </ol>
            <p className={styles.maturity}>We’ve built estimates, scheduling, job photos, payments and repeat visits before. The photo and routing parts we’d test with you.</p>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>What does your team keep having to explain twice?</h2>
          <p className={styles.closingBody}>Tell us which property details, crew questions or follow-ups keep coming back to you.</p>
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
