import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { FrontierHeader } from "@/components/landing/frontier-header";
import { Reveal } from "@/components/landing/reveal";
import { LegalLinks } from "@/components/legal/legal-links";
import frontier from "@/app/(landing)/frontier.module.css";
import industry from "@/components/landing/industries.module.css";
import { ParcelStudy, PresentationTools, VisibilityExample } from "./demos";
import { properties, sections } from "./content";
import styles from "./skorman.module.css";

const menuPages = [
  { title: "Pontian home", detail: "Frontier technology partner", href: "/" },
  ...sections.map((section) => ({
    title: section.label,
    detail: "For Skorman Development",
    href: `#${section.id}`,
  })),
  {
    title: "Start with one property",
    detail: "A first working session",
    href: "#next",
  },
];

export function SkormanPresentation() {
  return (
    <div className={`${frontier.home} ${styles.page}`}>
      <a className={frontier.skip} href="#content">
        Skip to content
      </a>
      <FrontierHeader
        context="For Skorman"
        action={{ label: "Start here", href: "#next" }}
        pages={menuPages}
      />
      <main id="content">
        <section
          id="begin"
          className={`${frontier.hero} ${styles.hero}`}
          aria-labelledby="skorman-title"
        >
          <div className={styles.heroText}>
            <p className={styles.overline}>Pontian / Skorman Development</p>
            <h1 id="skorman-title" className={frontier.headline}>
              <span>Built around</span>
              <span>Skorman.</span>
            </h1>
            <p className={styles.heroDescription}>
              From finding land to bringing people to your properties.
            </p>
          </div>
          <a href="#skorman" className={frontier.explore}>
            <ArrowDown size={22} strokeWidth={1.5} aria-hidden />
            <span>Explore the partnership</span>
          </a>
        </section>

        <figure className={styles.openingImage}>
          <Image
            src="/presentation/skorman/hills-city-center.png"
            alt="Hills City Center development rendering supplied by Skorman"
            fill
            sizes="100vw"
            className={industry.noir}
            loading="eager"
          />
          <div className={styles.imageShade} />
          <figcaption className={styles.imageCaption}>
            <span>Hills City Center</span>
            <span>Minneola, Florida / Planned phase rendering</span>
          </figcaption>
        </figure>

        <section
          id="skorman"
          className={`${styles.section} ${styles.context}`}
          aria-labelledby="property-heading"
        >
          <div className={styles.contextCopy}>
            <p className={styles.overline}>A developer&apos;s working day</p>
            <h2
              id="property-heading"
              className={`${frontier.statementText} ${styles.sectionTitle}`}
            >
              Start with
              <br />
              the property.
            </h2>
            <p>
              Skorman develops apartments, retail, mixed-use destinations,
              industrial property, and hospitality. Each has different people to
              reach and decisions to make.
            </p>
          </div>
          <div className={styles.propertyRows}>
            {properties.map((property) => (
              <a
                key={property.name}
                href={property.source}
                target="_blank"
                rel="noreferrer"
              >
                <div>
                  <h3>{property.name}</h3>
                  <p>{property.status}</p>
                </div>
                <span>
                  {property.stat}
                  <small>{property.unit}</small>
                </span>
                <ArrowUpRight size={18} strokeWidth={1.4} />
              </a>
            ))}
            <p className={styles.caption}>
              Company-reported project facts, checked October 1, 2026.
            </p>
          </div>
        </section>

        <nav
          className={styles.sectionNav}
          aria-label="Explore the Skorman proposal"
        >
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.label}
            </a>
          ))}
        </nav>

        <section
          id="searcher"
          className={styles.section}
          aria-labelledby="sites-heading"
        >
          <Reveal className={styles.sectionHeading}>
            <div>
              <p className={styles.overline}>Property research</p>
              <h2
                id="sites-heading"
                className={`${frontier.statementText} ${styles.sectionTitle}`}
              >
                Find the few sites
                <br />
                worth looking at.
              </h2>
            </div>
            <p>
              Research parcels, ownership, land use, and public records around
              Skorman&apos;s criteria. Give the team a shorter list to
              investigate.
            </p>
          </Reveal>
          <ParcelStudy />
          <div className={styles.evidenceLine}>
            <span>
              New listings / Foreclosure signals / Recorded sales / Site
              constraints
            </span>
            <span>Your team verifies the opportunity.</span>
          </div>
        </section>

        <section
          id="oversight"
          className={styles.section}
          aria-labelledby="changes-heading"
        >
          <Reveal className={styles.sectionHeading}>
            <div>
              <p className={styles.overline}>Development coordination</p>
              <h2
                id="changes-heading"
                className={`${frontier.statementText} ${styles.sectionTitle}`}
              >
                Know what changed.
              </h2>
            </div>
            <p>
              Track important changes across projects and put the update in
              front of the person who needs to act.
            </p>
          </Reveal>
          <figure className={styles.changeVisual}>
            <Image
              src="/pontian/design-engineering.jpeg"
              alt="Engineering drawings and project coordination, from Pontian's industry imagery"
              fill
              sizes="(max-width: 700px) 100vw, 86vw"
              className={industry.noir}
            />
            <div className={styles.imageShade} />
            <div className={styles.drawingNote}>
              <span>Illustrative project record</span>
              <div>
                <span>Access plan</span>
                <strong>Revision B</strong>
              </div>
              <p>
                Loading area affected.
                <br />
                Review required before drawings proceed.
              </p>
              <span>For the development lead</span>
            </div>
            <figcaption>
              Keep the plan, the change, and the decision connected.
            </figcaption>
          </figure>
          <details className={styles.example}>
            <summary>
              <span>Follow one change</span>
              <span className={styles.exampleHint}>Illustrative example</span>
              <ArrowUpRight size={18} strokeWidth={1.4} />
            </summary>
            <div className={styles.changeSteps}>
              <div>
                <span>01 / The update</span>
                <p>A revised access route overlaps the planned loading area.</p>
              </div>
              <div>
                <span>02 / The decision</span>
                <p>The development lead confirms the preferred arrangement.</p>
              </div>
              <div>
                <span>03 / The record</span>
                <p>
                  The approved direction stays attached to the next drawing
                  revision.
                </p>
              </div>
            </div>
          </details>
        </section>

        <section
          id="answers"
          className={`${styles.section} ${styles.knowledge}`}
          aria-labelledby="knowledge-heading"
        >
          <div className={styles.knowledgeImage}>
            <Image
              src="/presentation/skorman/vista-hills.png"
              alt="Vista Hills architectural rendering from Skorman, showing the planned development"
              fill
              sizes="(max-width: 700px) 100vw, 45vw"
              className={industry.noir}
            />
            <span>Vista Hills / Development rendering</span>
          </div>
          <div className={styles.knowledgeCopy}>
            <Reveal>
              <p className={styles.overline}>Company knowledge</p>
              <h2
                id="knowledge-heading"
                className={`${frontier.statementText} ${styles.sectionTitle}`}
              >
                Keep what
                <br />
                Skorman learns.
              </h2>
              <p className={styles.body}>
                Past decisions, consultant work, and municipality history can
                stay useful for the next development. Find the answer and the
                record behind it.
              </p>
            </Reveal>
            <details className={styles.example}>
              <summary>
                <span>What held up the drawings?</span>
                <ArrowUpRight size={18} strokeWidth={1.4} />
              </summary>
              <div className={styles.answer}>
                <span className={styles.caption}>
                  Prepared example / Fictional project
                </span>
                <p>
                  The revised access route overlapped the loading area. The
                  drawings needed the development lead&apos;s decision before
                  they could move ahead.
                </p>
                <details className={styles.sourceNote}>
                  <summary>
                    Read the source note <ArrowUpRight size={14} />
                  </summary>
                  <blockquote>
                    Revision B overlaps the loading area. Please confirm the
                    access arrangement before the next design review.
                  </blockquote>
                </details>
              </div>
            </details>
            <p className={styles.caption}>
              Built from approved files, with the team&apos;s existing access
              rules.
            </p>
          </div>
        </section>

        <section
          id="improvement"
          className={styles.section}
          aria-labelledby="improvement-heading"
        >
          <Reveal className={styles.sectionHeading}>
            <div>
              <p className={styles.overline}>An ongoing technology partner</p>
              <h2
                id="improvement-heading"
                className={`${frontier.statementText} ${styles.sectionTitle}`}
              >
                Always finding
                <br />
                a better way.
              </h2>
            </div>
            <p>
              We&apos;ll continuously find ways to improve your business with
              technology, as your needs change and new possibilities emerge.
            </p>
          </Reveal>
          <div className={styles.correspondence}>
            <div className={styles.improvementQuestion}>
              <span>The question we keep asking</span>
              <p>What could work better for your business?</p>
            </div>
            <div className={styles.documentIndex}>
              <span>A continuous process</span>
              <p>
                Identify opportunities <span>01</span>
              </p>
              <p>
                Test practical improvements <span>02</span>
              </p>
              <p>
                Build on what works <span>03</span>
              </p>
            </div>
          </div>
          <details className={styles.example}>
            <summary>
              <span>How we keep improving</span>
              <span className={styles.exampleHint}>Beyond the first launch</span>
              <ArrowUpRight size={18} strokeWidth={1.4} />
            </summary>
            <div className={styles.improvementApproach}>
              <span className={styles.caption}>
                Built around your business
              </span>
              <p>
                Stay close to how your team works. Find repetitive tasks,
                gaps in information, and systems that no longer fit the business.
              </p>
              <p>
                Test new tools against real needs, measure the difference,
                and refine the technology as your business evolves.
              </p>
            </div>
          </details>
        </section>

        <section
          id="visibility"
          className={styles.section}
          aria-labelledby="visibility-heading"
        >
          <Reveal className={styles.sectionHeading}>
            <div>
              <p className={styles.overline}>Property visibility / GEO + SEO</p>
              <h2
                id="visibility-heading"
                className={`${frontier.statementText} ${styles.sectionTitle}`}
              >
                Let people find
                <br />
                your properties.
              </h2>
            </div>
            <p>
              Make property information easier to find in Google and use in AI
              answers. Help visitors, renters, and business owners reach the
              right place.
            </p>
          </Reveal>
          <VisibilityExample />
          <div className={styles.evidenceLine}>
            <span>
              Start with accurate information and useful property pages.
            </span>
            <span>Measure website visits and inquiries.</span>
          </div>
        </section>

        <section
          id="experience"
          className={`${styles.section} ${styles.experience}`}
          aria-labelledby="experience-heading"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.overline}>Pontian&apos;s work</p>
              <h2
                id="experience-heading"
                className={`${frontier.statementText} ${styles.sectionTitle}`}
              >
                Built around
                <br />
                real operations.
              </h2>
            </div>
            <p>
              Our work includes connecting reports and making company
              information easier to use.
            </p>
          </div>
          <div className={styles.experienceRows}>
            <div>
              <h3>Reporting across locations</h3>
              <p>Data from several retail locations in one owner report.</p>
              <span>Built reporting tools</span>
            </div>
            <div>
              <h3>Company documents</h3>
              <p>Answers linked to source files, with access controls.</p>
              <span>Built document tools</span>
            </div>
            <div>
              <h3>Engineering changes</h3>
              <p>A change followed through affected teams and reviews.</p>
              <span>Demo / Simulated connections</span>
            </div>
          </div>
          <p className={styles.caption}>
            The Skorman systems described here would be new implementations.
          </p>
        </section>

        <section
          id="horizon"
          className={styles.horizon}
          aria-labelledby="horizon-heading"
        >
          <Image
            src="/presentation/skorman/minneola-hills.png"
            alt="Minneola Hills property visual from Skorman"
            fill
            sizes="100vw"
            className={industry.noir}
          />
          <div className={styles.horizonShade} />
          <Reveal className={styles.horizonCopy}>
            <p className={styles.overline}>The longer view</p>
            <h2
              id="horizon-heading"
              className={`${frontier.statementText} ${styles.sectionTitle}`}
            >
              Let each project
              <br />
              inform the next.
            </h2>
            <p>
              Keep the original site research alongside approvals, construction
              decisions, and operating results. Build a record that stays useful
              as the portfolio grows.
            </p>
          </Reveal>
          <div className={styles.lifecycle}>
            <span>Research</span>
            <span>Develop</span>
            <span>Operate</span>
            <span>Learn</span>
          </div>
          <span className={styles.horizonCredit}>
            Minneola Hills / Property visual
          </span>
        </section>

        <section
          id="next"
          className={`${frontier.statement} ${styles.close}`}
          aria-labelledby="next-heading"
        >
          <div className={frontier.statementAccent} aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <h2 id="next-heading" className={frontier.statementText}>
            Start with Hills City Center.
            <br />
            Build from there.
          </h2>
          <div className={styles.closeBody}>
            <p>
              Bring the property and marketing leads into a working session.
              Review the website and inquiry process, then agree on the first
              changes and how to measure them.
            </p>
            <Link
              href="/contact/skorman"
              className={`${industry.contact} ${styles.contactLink}`}
            >
              Talk with Pontian <ArrowUpRight size={18} strokeWidth={1.4} />
            </Link>
          </div>
          <footer className={styles.footer}>
            <Link href="/">
              Pontian <ArrowUpRight size={14} />
            </Link>
            <span>Prepared for Skorman Development</span>
            <PresentationTools />
            <LegalLinks />
          </footer>
        </section>
      </main>
    </div>
  );
}
