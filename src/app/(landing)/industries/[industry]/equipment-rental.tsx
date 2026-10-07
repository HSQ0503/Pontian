import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Industry } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./equipment-rental.module.css";
import { BREAKER, BREAKER_TYPE, EX014, EX027, EX027_STATE, MACHINE_TYPE, QUARRY, YARD } from "./equipment-rental-fleet";
import { ManageRental, MatchMachine, PrepareDelivery, ReturnToService } from "./equipment-rental-visuals";

export const equipmentRentalHeadline = "Keep the right machines working.";
export const equipmentRentalSummary =
  "We build tools that connect equipment requests, fleet readiness, rental commitments, and service records—helping your team arrange rentals and respond when plans change.";

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
    id: "match-the-machine",
    label: "Match the machine",
    moment: "Before the quote",
    headline: "Turn the request into a machine shortlist.",
    body: "We can interpret a customer's requirements and compare them with your equipment specifications, attachments, rental calendar, and readiness records—giving the rental team a shortlist with clear reasons and open questions.",
    capabilities: ["Understand the job requirements", "Check machines and compatible attachments", "Identify what needs confirmation"],
    outcome: "Give the rental desk a shortlist it can explain.",
    Visual: MatchMachine,
  },
  {
    id: "prepare-the-delivery",
    label: "Prepare the delivery",
    moment: "Before dispatch",
    headline: "Check the whole handoff before promising delivery.",
    body: "We can connect machine readiness, attachment availability, transport arrangements, and site access requirements so your team can see what still stands between a reservation and a deliverable rental.",
    capabilities: ["Check readiness beyond the calendar", "Coordinate machine, attachment, and transport", "Confirm the receiving site's requirements"],
    outcome: "Know what must be resolved before committing to delivery.",
    Visual: PrepareDelivery,
  },
  {
    id: "manage-the-rental",
    label: "Manage the rental",
    moment: "While on rent",
    headline: "See what an extension changes.",
    body: "We can connect active rentals, recorded usage, upcoming reservations, and service requirements so your team can review an extension or replacement request with its consequences in view.",
    capabilities: ["Review extensions against existing commitments", "Check suitable alternatives", "Keep usage and agreed terms connected"],
    outcome: "Handle a changing rental without losing sight of the next customer.",
    Visual: ManageRental,
  },
  {
    id: "return-it-to-service",
    label: "Return it to service",
    moment: "After return",
    headline: "Turn the return into a clear readiness decision.",
    body: "We can organize return photos, meter readings, attachment records, and inspection findings against the original handoff, helping the team identify discrepancies and the work required before the next rental.",
    capabilities: ["Compare handoff and return evidence", "Keep inspections and service work connected", "Release equipment through the approved process"],
    outcome: "Know what stands between a returned machine and its next rental.",
    Visual: ReturnToService,
  },
];

const cast = [
  { id: EX014, kind: MACHINE_TYPE, place: YARD, state: "Ready for rental, readiness record current" },
  { id: EX027, kind: MACHINE_TYPE, place: YARD, state: EX027_STATE },
  { id: BREAKER, kind: BREAKER_TYPE, place: YARD, state: "No reservation" },
  { id: "Quarry", kind: "Delivery site", place: QUARRY, state: "Requirements to confirm" },
];

const scopes = [
  "Request-to-shortlist assistance for one machine class.",
  "Readiness and delivery checks across one rental yard.",
  "Extension handling for a defined rental category.",
  "Return inspection and release workflows.",
];

export function EquipmentRentalPage({ industry, index, next }: { industry: Industry; index: number; next: Industry }) {
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
            <h1 id="industry-title" className={styles.headline}>{equipmentRentalHeadline}</h1>
            <p className={styles.heroLead}>{equipmentRentalSummary}</p>
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

        <section id="the-example" className={styles.story} aria-labelledby="the-example-title">
          <div className={styles.storyHead}>
            <div>
              <p className={styles.startLabel}>One machine, one rental</p>
              <h2 id="the-example-title" className={styles.storyTitle}>Follow {EX014} from request to return.</h2>
            </div>
            <div>
              <p className={styles.storyBody}>The examples below follow a fictional tracked excavator through a rental for a surface quarry. A second machine, {EX027}, is the alternative candidate. It is awaiting inspection when the story begins.</p>
              <p className={styles.storyRule}>AI can help interpret requests, retrieve specifications, investigate conflicts, and prepare proposals. Availability, pricing, and scheduling follow your explicit records and rules. AI does not override equipment restrictions or maintenance holds.</p>
            </div>
          </div>
          <ul className={styles.cast}>
            {cast.map((item) => (
              <li key={item.id}>
                <strong>{item.id}</strong>
                <span>{item.kind}</span>
                <span>{item.place}</span>
                <span className={styles.castState}>{item.state}</span>
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

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div>
            <p className={styles.startLabel}>How we start</p>
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with one part of your fleet.</h2>
          </div>
          <div>
            <p className={styles.startBody}>We work with your rental, dispatch, and maintenance teams to define the records and decisions that matter, then test a focused workflow with a selected equipment category.</p>
            <p className={styles.startLabel}>Possible starting scopes</p>
            <ol className={styles.startSteps}>
              {scopes.map((scope, scopeIndex) => (
                <li key={scope}>
                  <span>{String(scopeIndex + 1).padStart(2, "0")}</span>
                  <p>{scope}</p>
                </li>
              ))}
            </ol>
            <p className={styles.startNote}>We use your existing fleet systems where appropriate. Authorized access, supported data, and integration feasibility are established before we promise any connected capability.</p>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
          <h2 id="talk-title" className={styles.closingTitle}>Where does a rental get held up?</h2>
          <p className={styles.closingBody}>Finding the machine, arranging delivery, handling an extension, or preparing the next rental—we can start with the decision that creates the most friction.</p>
          <Link href="/get-started" className={styles.closingButton}>Talk through your rental operation <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className={base.footer}>
        <Link href="/#industries"><ArrowLeft size={14} /> All industries</Link>
        <Link href={`/industries/${next.slug}`}>Next: {next.name} <ArrowRight size={14} /></Link>
      </footer>
    </div>
  );
}
