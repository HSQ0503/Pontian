import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { industries } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./retail.module.css";
import { KnowTheCustomer, PlanTheNextVisit, StockForDemand, UnderstandTheBusiness } from "./retail-visuals";
import { HeroPhoto, IndustryHero } from "./industry-hero";

const SLUG = "retail";
const headline = "Help your team remember what customers love.";
const summary =
  "We tie your receipts to what customers have told your staff. Your salespeople get a short briefing before they say hello, and you get straight answers about each store.";

export const retailMetadata: Metadata = {
  title: "Retail",
  description: `${headline} ${summary}`,
  alternates: { canonical: `/industries/${SLUG}` },
  openGraph: { title: "Pontian for Retail", description: `${headline} ${summary}`, url: `/industries/${SLUG}`, siteName: "Pontian", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pontian" }] },
  twitter: { card: "summary_large_image", title: "Pontian for Retail", description: `${headline} ${summary}`, images: ["/og.png"] },
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
    id: "know-the-customer",
    label: "Know the customer",
    moment: "Before the conversation",
    headline: "Give your salesperson the context before the conversation.",
    body: "Staff look a customer up by name and get a reason for each suggestion on the shelf. It won’t invent a personality, or push a bag for the margin.",
    outcome: "Start the conversation with something the customer actually cares about.",
    Visual: KnowTheCustomer,
  },
  {
    id: "understand-the-business",
    label: "Understand the business",
    moment: "Across your stores",
    headline: "Ask a business question. Follow the evidence.",
    body: "Ask why one store’s margin is lower. The check uses both stores’ sales records, and it says what they can’t explain.",
    outcome: "Know which difference deserves your attention.",
    Visual: UnderstandTheBusiness,
  },
  {
    id: "plan-the-next-visit",
    label: "Plan the next visit",
    moment: "Between visits",
    headline: "Know when a follow-up is worth sending.",
    body: "When a regular goes quiet, the tool looks for a newer purchase before it drafts a note. Nothing goes out until your team approves it.",
    outcome: "Give customers a useful reason to return.",
    Visual: PlanTheNextVisit,
  },
  {
    id: "stock-for-demand",
    label: "Stock for demand",
    moment: "Before the shelf runs low",
    headline: "Put stock where it’s more likely to sell.",
    body: "The shelf count sits next to usual sales and what’s already on order. A short store and a full one become a transfer a manager can approve. The forecast stays an estimate.",
    outcome: "Make the stock call with its assumptions in view.",
    Visual: StockForDemand,
  },
];

export function RetailPage() {
  const index = industries.findIndex((item) => item.slug === SLUG);
  const industry = industries[index];
  if (!industry) notFound();
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
          media={<HeroPhoto src={industry.image} alt={industry.alt} position="50% 50%" />}
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
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with the records you already keep.</h2>
          </div>
          <div>
            <p className={styles.startBody}>We start with one store and one job: a briefing, a set catalog, or one follow-up. Stock planning waits until the counts and the supplier data are reliable. Your team decides if it’s useful before we add more.</p>
            <p className={styles.startNote}>Sales analysis is work we’ve already done. Briefings, follow-ups and stock plans get built and tested with you.</p>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>What should your team know before the next customer walks in?</h2>
          <p className={styles.closingBody}>Tell us how you sell and what your point-of-sale system already records.</p>
          <Link href="/get-started" className={styles.closingButton}>Talk through your retail operation <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className={base.footer}>
        <Link href="/#industries"><ArrowLeft size={14} /> All industries</Link>
        <Link href={`/industries/${next.slug}`}>Next: {next.name} <ArrowRight size={14} /></Link>
      </footer>
    </div>
  );
}
