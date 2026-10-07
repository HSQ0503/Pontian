import type { ComponentType } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { industries } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./logistics.module.css";
import { formatKg, operation, plans, vehicles } from "./logistics-data";
import { DeliveryPlan, DisruptionRecovery, QuotePreparation } from "./logistics-visuals";
import { LoadPlan } from "./logistics-load";

const SLUG = "logistics";
const headline = "Make every shipment work better.";
const summary =
  "We build tools that help logistics teams plan deliveries, use vehicle space, respond to disruptions, and prepare quotes around the realities of their operation.";

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
  capabilities: string[];
  outcome: string;
  brokers?: string;
  boundary: string;
  Visual: ComponentType;
};

const offerings: Offering[] = [
  {
    id: "plan-the-deliveries",
    label: "Plan the deliveries",
    audience: "For fleet operators",
    headline: "Give every delivery a workable place in the day.",
    body: "We can connect orders, delivery windows, vehicle capacity, and driver availability to prepare a dispatch plan your team can review. When another job arrives, see where it could fit and which commitments would be affected.",
    capabilities: ["Assign deliveries to suitable vehicles", "Account for capacity and delivery windows", "Review changes before dispatch"],
    outcome: "See how the day fits together before sending vehicles out.",
    boundary: "Route planning depends on defined operating rules and suitable mapping or optimization technology. The shortest route is not always right for a particular truck, so vehicle restrictions, driver rules, and service times have to be part of those rules. This example uses fixed drive times, not live locations.",
    Visual: DeliveryPlan,
  },
  {
    id: "plan-the-load",
    label: "Plan the load",
    audience: "For fleet operators",
    headline: "See how the load fits before loading starts.",
    body: "We can turn shipment dimensions, weights, stacking rules, and delivery order into a proposed loading plan, helping your team check both space and access before the truck leaves.",
    capabilities: ["Check how shipments fit", "Account for loading restrictions", "Plan around the unloading order"],
    outcome: "Give the loading team a plan they can inspect before moving freight.",
    boundary: "A loading illustration is not a certified safe-loading plan. Production use needs accurate cargo and vehicle data, appropriate checks, and operational review, and fitting in the space does not establish weight distribution or load securement. This is a workflow we could develop with suitable optimization technology, not an existing Pontian packing engine.",
    Visual: LoadPlan,
  },
  {
    id: "handle-the-disruption",
    label: "Handle the disruption",
    audience: "For fleet operators and brokers",
    headline: "Find the next workable move.",
    body: "When a vehicle becomes unavailable or a delivery is delayed, we can help dispatch identify the affected shipments and compare recovery options using the information available.",
    capabilities: ["Identify affected deliveries", "Compare available recovery options", "Prepare revised assignments and customer updates"],
    outcome: "Give dispatch options and consequences in the same place.",
    brokers: "For a broker, the alternatives are other carriers rather than your own vehicles. Finding the affected shipments and preparing reviewed customer updates work the same way.",
    boundary: "The example starts from a recorded vehicle-status update. It does not predict breakdowns or track vehicles continuously, and it depends on reliable operational updates, current capacity, and defined rules.",
    Visual: DisruptionRecovery,
  },
  {
    id: "prepare-the-quote",
    label: "Prepare the quote",
    audience: "For fleet operators and brokers",
    headline: "Turn a shipment request into a quote you can explain.",
    body: "We can extract shipment details from incoming requests, identify missing information, and prepare a quote using your approved pricing rules and available capacity.",
    capabilities: ["Extract the shipment requirements", "Flag information that needs confirmation", "Prepare a quote from approved pricing rules"],
    outcome: "Respond with a price your team can stand behind.",
    brokers: "For a broker, reading the request and flagging missing details work the same way. Pricing would start from a carrier's cost and your approved margin rules, which is a separate calculation from the carrier rate card shown here.",
    boundary: "The example applies a carrier's own example rate card. It does not use current market freight rates, which would need an appropriate data source, and it does not call the job profitable, because vehicle, driver, and fuel costs are not part of the calculation.",
    Visual: QuotePreparation,
  },
];

const collectionStop = plans.requestOnB.stops.findIndex((stop) => stop.shipment === "KV-2046" && stop.action === "collect") + 1;

const journey = [
  { section: "prepare-the-quote", title: "A request becomes a quote.", text: "Request Q-0118 asks for two pallets to go from Glenway Works to Hollin Yard. Once the dimensions are confirmed, the commercial team reviews a draft quote." },
  { section: "plan-the-deliveries", title: "Accepted work enters a delivery plan.", text: `As shipment KV-2046, the job goes to Vehicle B as stops ${collectionStop} and ${collectionStop + 1}, after its existing deliveries.` },
  { section: "plan-the-load", title: "The freight receives a loading plan.", text: `Vehicle B's first three deliveries are loaded so each comes off in order, leaving the truck empty for KV-2046 at stop ${collectionStop}.` },
  { section: "handle-the-disruption", title: "Dispatch responds when conditions change.", text: "When Vehicle A is unavailable, Vehicle B takes KV-2044 and still keeps KV-2046's collection and delivery windows." },
];

const startingScopes = [
  "Replay historical dispatch days.",
  "Plan loads for one vehicle and cargo type.",
  "Test responses to one recurring disruption.",
  "Prepare reviewed quotes for one shipment category.",
];

export function LogisticsPage({ index }: { index: number }) {
  const industry = industries[index];
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
                  <span className={styles.navAudience}>{offering.audience}</span>
                  <ArrowDown size={15} strokeWidth={1.4} aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>
        </section>

        <section id="example-operation" className={styles.operation} aria-labelledby="operation-title">
          <div>
            <p className={styles.sectionLabel}>The examples on this page</p>
            <h2 id="operation-title" className={styles.operationTitle}>One fictional operation runs through every example.</h2>
            <p className={styles.operationBody}>
              {operation.name} is an invented regional carrier with one depot and two vehicles. Shipment IDs, destinations, vehicle capacities, and cargo stay the same wherever a record appears again.
            </p>
            <p className={styles.operationAudience}>
              Fleet operators run their own vehicles and drivers. Freight brokers arrange carriers to move freight. Each section says which of them it serves.
            </p>
          </div>
          <ul className={styles.fleet} aria-label={`${operation.name} vehicles`}>
            {Object.values(vehicles).map((vehicle) => (
              <li key={vehicle.id}>
                <span className={styles.fleetName}>{vehicle.name}</span>
                <span className={styles.fleetBody}>{vehicle.body}</span>
                <dl>
                  <div><dt>Cargo space</dt><dd>{vehicle.cargo.length} × {vehicle.cargo.width} × {vehicle.cargo.height} m</dd></div>
                  <div><dt>Capacity</dt><dd>{vehicle.palletSpaces} pallet spaces, {formatKg(vehicle.payloadKg)}</dd></div>
                  <div><dt>Driver available</dt><dd>{vehicle.driver[0]}–{vehicle.driver[1]}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
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
              <div>
                <p className={styles.offeringBody}>{offering.body}</p>
                <ul className={styles.capabilities}>
                  {offering.capabilities.map((capability) => <li key={capability}>{capability}</li>)}
                </ul>
              </div>
            </div>
            <offering.Visual />
            <p className={styles.outcomeLine}>{offering.outcome}</p>
            <div className={`${styles.limits} ${offering.brokers ? "" : styles.limitsSingle}`}>
              {offering.brokers && <p><strong>For freight brokers</strong>{offering.brokers}</p>}
              <p><strong>What this depends on</strong>{offering.boundary}</p>
            </div>
          </section>
        ))}

        <section id="one-shipment" className={styles.recap} aria-labelledby="recap-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="recap-title" className={styles.recapTitle}>One shipment, carried through the operation.</h2>
          <p className={styles.recapBody}>The sections start with planning, but the same shipment information can carry through the whole process. Follow KV-2046 from the first message to the day it is delivered.</p>
          <ol className={styles.recapList}>
            {journey.map((step, stepIndex) => {
              const offering = offerings.find((item) => item.id === step.section);
              return (
                <li key={step.section}>
                  <span className={styles.recapIndex}>{String(stepIndex + 1).padStart(2, "0")}</span>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                  <a href={`#${step.section}`}>{offering?.label} <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" /></a>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div>
            <p className={styles.sectionLabel}>How we start</p>
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with one part of the operation.</h2>
          </div>
          <div>
            <p className={styles.startBody}>We work with your team to define the rules, connect the necessary information, and test a focused workflow against real examples before expanding it.</p>
            <ol className={styles.scopes}>
              {startingScopes.map((scope, scopeIndex) => (
                <li key={scope}><span>{String(scopeIndex + 1).padStart(2, "0")}</span>{scope}</li>
              ))}
            </ol>
            <p className={styles.scopeNote}>These are examples of pilot scope, not delivery or savings commitments.</p>
            <p className={styles.startJudge}>Your team helps judge whether the output is workable.</p>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>Where does your operation lose time, space, or margin?</h2>
          <p className={styles.closingBody}>Tell us about the deliveries, loading decisions, disruptions, or quotes your team handles repeatedly.</p>
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
