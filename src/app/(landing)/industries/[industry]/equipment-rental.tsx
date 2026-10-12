import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Industry } from "@/lib/industries";
import { FrontierHeader } from "@/components/landing/frontier-header";
import frontier from "../../frontier.module.css";
import base from "./industry.module.css";
import styles from "./equipment-rental.module.css";
import heroRender from "../../../../../public/pontian/equipment-rental-hero.webp";
import { EX014 } from "./equipment-rental-fleet";
import { HeroPhoto, IndustryHero } from "./industry-hero";
import { ManageRental, MatchMachine, PrepareDelivery, ReturnToService } from "./equipment-rental-visuals";

export const equipmentRentalHeadline = "Keep the right machines working.";
export const equipmentRentalSummary =
  "We build software that ties a rental request to the right machine, its delivery, its time on site and its return. Your team sees what’s actually ready, and what a change will break.";

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
    id: "match-the-machine",
    label: "Match the machine",
    moment: "Before the quote",
    headline: "Turn a vague request into a shortlist.",
    body: `Customers rarely send a full spec. We can build a tool that checks the request against your machines, calendar and inspection records, and flags what’s missing. The examples follow one made-up excavator, ${EX014}.`,
    outcome: "Give the rental desk a shortlist it can explain.",
    Visual: MatchMachine,
  },
  {
    id: "prepare-the-delivery",
    label: "Prepare the delivery",
    moment: "Before dispatch",
    headline: "Check the whole handoff before you promise delivery.",
    body: "A free machine isn’t a delivered one. The truck and the quarry gate have to line up first. We can show your dispatcher which of those is still open.",
    outcome: "Know what’s still open before you commit to a delivery date.",
    Visual: PrepareDelivery,
  },
  {
    id: "manage-the-rental",
    label: "Manage the rental",
    moment: "While on rent",
    headline: "See what an extension changes.",
    body: "Three more days sounds easy until the machine is booked for someone else. We can put the clash and the options in front of your team before anyone says yes.",
    outcome: "Say yes to the extension without letting the next customer down.",
    Visual: ManageRental,
  },
  {
    id: "return-it-to-service",
    label: "Return it to service",
    moment: "After return",
    headline: "Decide when a returned machine can go back out.",
    body: "We can line up return photos and meter readings against the handoff. Your inspector sees what changed. The machine stays off the board until someone signs it off.",
    outcome: "Know what stands between a returned machine and its next rental.",
    Visual: ReturnToService,
  },
];

export function EquipmentRentalPage({ industry, index, next }: { industry: Industry; index: number; next: Industry }) {
  return (
    <div className={`${frontier.home} ${base.page}`}>
      <a className={frontier.skip} href="#industry-content">Skip to content</a>
      <FrontierHeader />
      <main id="industry-content">
        <IndustryHero
          industry={industry}
          index={index}
          headline={equipmentRentalHeadline}
          summary={equipmentRentalSummary}
          links={offerings.map((offering) => ({ id: offering.id, label: offering.label, detail: offering.moment }))}
          media={<HeroPhoto src={heroRender} alt={`Render of ${EX014}, the made-up tracked excavator followed through this page’s examples`} position="50% 50%" />}
        />

        {offerings.map((offering, offeringIndex) => (
          <section key={offering.id} id={offering.id} className={styles.offering} aria-labelledby={`${offering.id}-title`}>
            <div className={styles.inner}>
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
            </div>
          </section>
        ))}

        <section id="how-we-start" className={styles.start} aria-labelledby="how-we-start-title">
          <div>
            <p className={styles.label}>How we start</p>
            <h2 id="how-we-start-title" className={styles.startTitle}>Start with one part of your fleet.</h2>
          </div>
          <div>
            <p className={styles.startBody}>Pick one machine class or one yard. We map the records your desk, dispatch and shop already keep, then run one workflow beside your current process.</p>
            <p className={styles.startNote}>The software suggests. Your rules still decide availability, prices and holds.</p>
          </div>
        </section>

        <section id="talk" className={styles.closing} aria-labelledby="talk-title">
          <div className={styles.inner}>
            <div className={styles.accent} aria-hidden="true"><span /><span /><span /></div>
            <h2 id="talk-title" className={styles.closingTitle}>Where does a rental get held up?</h2>
            <p className={styles.closingBody}>Finding the machine, getting it there, an extension, the turnaround. Tell us which one costs you most and we’ll start there.</p>
            <Link href="/get-started" className={styles.closingButton}>Talk through your rental operation <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <footer className={base.footer}>
        <Link href="/#industries"><ArrowLeft size={14} /> All industries</Link>
        <Link href={`/industries/${next.slug}`}>Next: {next.name} <ArrowRight size={14} /></Link>
      </footer>
    </div>
  );
}
