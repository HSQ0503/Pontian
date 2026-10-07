import type { ComponentType } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { industries } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./retail.module.css";
import { KnowTheCustomer, PlanTheNextVisit, StockForDemand, UnderstandTheBusiness } from "./retail-visuals";

const SLUG = "retail";
const headline = "Help your team remember what customers love.";
const summary =
  "We connect purchase history, customer preferences, and product knowledge so your team can make relevant recommendations, plan thoughtful follow-ups, and understand what works across your stores.";

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
  summary: string;
  headline: string;
  body: string;
  capabilities: string[];
  note: string;
  outcome: string;
  Visual: ComponentType;
};

const offerings: Offering[] = [
  {
    id: "know-the-customer",
    label: "Know the customer",
    moment: "Before the conversation",
    summary: "The salesperson understands Maya's history.",
    headline: "Give your salesperson the context before the conversation.",
    body: "We can bring a customer's recent purchases, recorded preferences, and relevant service history into a concise briefing, then suggest useful products or experiences with a clear reason behind each recommendation.",
    capabilities: ["See recent purchases and recorded preferences", "Suggest relevant products and upgrades", "Introduce a suitable next experience"],
    note: "A custom workflow we would develop and validate with your team. It uses authorized customer records and appropriate staff access. It never infers personal traits, and never suggests an item just because its margin is higher.",
    outcome: "Help the conversation start with something the customer actually cares about.",
    Visual: KnowTheCustomer,
  },
  {
    id: "understand-the-business",
    label: "Understand the business",
    moment: "Across your stores",
    summary: "The owner understands what is happening across stores.",
    headline: "Ask a business question. Follow the evidence.",
    body: "We build AI-assisted analysis that helps owners investigate sales, product margins, discounts, and customer behavior across locations, then identify practical questions and actions for their managers.",
    capabilities: ["Compare locations consistently", "Investigate the underlying transactions", "Turn findings into a focused next step"],
    note: "Builds on our work in transaction analysis and product performance. Sales, product gross margin, and business profit are kept distinct, and a difference in what sold is not treated as proof of why.",
    outcome: "Understand what deserves attention, not just what changed.",
    Visual: UnderstandTheBusiness,
  },
  {
    id: "plan-the-next-visit",
    label: "Plan the next visit",
    moment: "Between visits",
    summary: "The team recognizes a relevant reason to reconnect.",
    headline: "Recognize when a thoughtful follow-up could help.",
    body: "We can use purchase and service patterns to identify a relevant reason to reconnect, check for more recent activity, and prepare a message for your team to review.",
    capabilities: ["Recognize repeat-purchase patterns", "Check whether follow-up is still relevant", "Prepare a personal message for review"],
    note: "A custom workflow we would develop and validate with your team. It respects consent, channel preferences, and contact frequency, and nothing is sent without review.",
    outcome: "Give customers a useful reason to return.",
    Visual: PlanTheNextVisit,
  },
  {
    id: "stock-for-demand",
    label: "Stock for demand",
    moment: "Before the shelf runs low",
    summary: "Inventory planning supports the products being recommended.",
    headline: "Put stock where it is more likely to sell.",
    body: "We can combine sales patterns with current inventory, incoming orders, and supplier lead times to help your team review replenishment and store-transfer decisions.",
    capabilities: ["Forecast demand by product and location", "Compare stock with expected needs", "Prepare replenishment or transfer proposals"],
    note: "A proposed extension that needs suitable stock and supplier data, and validation before anyone relies on it. Forecasts are estimates and are always shown apart from recorded counts.",
    outcome: "Make the stock decision with its assumptions in view.",
    Visual: StockForDemand,
  },
];

const startingScopes = [
  "Customer briefings for one store.",
  "Product recommendations for a defined catalog.",
  "A repeat-purchase follow-up workflow.",
  "A recurring question about performance across locations.",
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
                <p className={styles.offeringNote}>{offering.note}</p>
              </div>
            </div>
            <offering.Visual />
            <p className={styles.outcomeLine}>{offering.outcome}</p>
          </section>
        ))}

        <section className={styles.recap} aria-labelledby="recap-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="recap-title" className={styles.recapTitle}>One retailer&apos;s records, turned into useful work.</h2>
          <p className={styles.recapLead}>The same fictional coffee retailer, the same customer, and the same products run through every example on this page.</p>
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
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with the information your business already has.</h2>
          </div>
          <div>
            <p className={styles.startBody}>We connect a defined set of retail records, check their quality, and build a focused workflow with the people who will use it. Your team helps evaluate whether the recommendations and analysis are useful before the scope expands.</p>
            <p className={styles.startListLabel}>Possible starting scopes</p>
            <ol className={styles.startSteps}>
              {startingScopes.map((scope, scopeIndex) => (
                <li key={scope}>
                  <span>{String(scopeIndex + 1).padStart(2, "0")}</span>
                  <p>{scope}</p>
                </li>
              ))}
              <li data-additional="true">
                <span>+</span>
                <p>Inventory planning, as an additional scope once the required stock and supplier information is available.</p>
              </li>
            </ol>
            <p className={styles.startNote}>Our retail work so far covers transaction analysis, customer histories, product performance, and AI-assisted business analysis. Personalized selling, follow-up workflows, and inventory planning are custom capabilities we would develop and validate with you.</p>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>What should your team know before the next customer walks in?</h2>
          <p className={styles.closingBody}>Tell us how you sell, what your systems already record, and where useful information gets lost.</p>
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
