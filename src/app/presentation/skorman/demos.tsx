"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  FileText,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import styles from "./skorman.module.css";

export function DemoLabel({
  children = "Example search journey",
}: {
  children?: string;
}) {
  return (
    <span className={styles.demoLabel}>
      <span />
      {children}
    </span>
  );
}

const journeys = [
  {
    name: "Visit",
    query: "Where can we take the kids near Clermont?",
    title: "An afternoon at Hills City Center.",
    property: "Hills City Center",
    answer:
      "Hills City Center in Minneola includes Crooked Can and Splash & Play. Check the current hours and attractions when planning your visit.",
    action: "Plan a visit",
    route:
      "A page with current attractions, directions, and visitor information from the operator.",
    goal: "Directions and event clicks",
    note: "Let visitors check what's open before they make the trip.",
  },
  {
    name: "Live",
    query: "Apartments near the turnpike in Minneola?",
    title: "Take a look at Minneola Hills.",
    property: "Minneola Hills",
    answer:
      "For Minneola Hills, start with the community's leasing website to check floor plans and current availability or ask about a tour.",
    action: "Explore the community",
    route:
      "The community's existing website, where the leasing team handles inquiries.",
    goal: "Qualified leasing inquiries",
    note: "Keep the website's availability and property details up to date with the operator.",
  },
  {
    name: "Lease",
    query: "Where could I open a business in Minneola?",
    title: "Find the contact for the property.",
    property: "Skorman's commercial developments",
    answer:
      "Skorman has retail and mixed-use developments. Contact the team for the property you're considering to ask about space and upcoming phases.",
    action: "Ask about space",
    route: "The broker or team responsible for that specific property.",
    goal: "Relevant commercial inquiries",
    note: "Help business owners find the contact who can confirm availability.",
  },
];

export function VisibilityDemo() {
  const [audience, setAudience] = useState(0);
  const [step, setStep] = useState(0);
  const journey = journeys[audience];
  return (
    <div className={styles.visibilityDemo}>
      <div className={styles.demoTop}>
        <span>How someone could find the property</span>
        <DemoLabel />
      </div>
      <div className={styles.segmented} aria-label="Choose a property audience">
        {journeys.map((item, index) => (
          <button
            key={item.name}
            aria-pressed={audience === index}
            onClick={() => {
              setAudience(index);
              setStep(0);
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className={styles.searchField}>
        <Search size={20} />
        <span>{journey.query}</span>
        <span className={styles.searchCursor} aria-hidden />
      </div>
      <div className={styles.journeyBody}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${audience}-${step}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className={styles.journeyResult}
          >
            {step === 0 ? (
              <>
                <div className={styles.searchOrbit} aria-hidden>
                  <span>Google</span>
                  <span>
                    <Sparkles size={18} /> AI answers
                  </span>
                  <svg viewBox="0 0 400 100">
                    <motion.path
                      d="M80 5 C80 60 200 35 200 90 M320 5 C320 60 200 35 200 90"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.65, ease: "easeOut" }}
                    />
                  </svg>
                  <i>
                    <MapPin size={26} />
                  </i>
                </div>
                <h3>
                  Give people the details
                  <br />
                  they&apos;re looking for.
                </h3>
                <p>{journey.note}</p>
              </>
            ) : step === 1 ? (
              <>
                <span className={styles.smallLabel}>
                  Example AI search answer
                </span>
                <h3>{journey.title}</h3>
                <p>{journey.answer}</p>
                <span className={styles.citationPill}>
                  <FileText size={14} /> Accurate property information
                </span>
              </>
            ) : (
              <>
                <span className={styles.smallLabel}>
                  Where the visitor goes next
                </span>
                <h3>{journey.property}</h3>
                <div className={styles.exampleAction}>
                  {journey.action}
                  <ArrowUpRight size={20} />
                </div>
                <p>{journey.route}</p>
                <span className={styles.citationPill}>
                  <Check size={14} /> Measure: {journey.goal.toLowerCase()}
                </span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div
        className={styles.journeySteps}
        aria-label="Explore the search journey"
      >
        {["The question", "The answer", "The next step"].map((name, index) => (
          <button
            key={name}
            aria-pressed={step === index}
            onClick={() => setStep(index)}
          >
            <span>{index + 1}</span>
            {name}
            {index < 2 && <ChevronRight size={16} />}
          </button>
        ))}
      </div>
      <p className={styles.finePrint}>
        These search results are written for the demo. Rankings and inquiry
        volume aren&apos;t guaranteed.
      </p>
    </div>
  );
}

type SiteKind = "Land" | "Apartments" | "Commercial";
type ExampleSite = {
  id: string;
  name: string;
  kind: SiteKind;
  size: string;
  signal: string;
  why: string;
  check: string;
  source: string;
  x: number;
  y: number;
};
const exampleSites: ExampleSite[] = [
  {
    id: "A",
    name: "Growth corridor parcel",
    kind: "Land",
    size: "22 acres",
    signal: "Newly marketed",
    why: "This 22-acre example fits the team's preferred use and size in a growth corridor.",
    check: "Verify access, utilities, zoning, and usable acreage.",
    source:
      "Example broker listing and parcel record. We'd need agreed access to current records for the real searcher.",
    x: 60,
    y: 29,
  },
  {
    id: "B",
    name: "Apartment repositioning",
    kind: "Apartments",
    size: "88 homes",
    signal: "Foreclosure notice",
    why: "A foreclosure notice flags this example for review. Check the case before treating it as a buying opportunity.",
    check: "Verify case status, title, condition, and comparable sales.",
    source:
      "Example foreclosure notice and recorded sales. A notice alone doesn't confirm that a property is available or worth buying.",
    x: 37,
    y: 62,
  },
  {
    id: "C",
    name: "Commercial infill site",
    kind: "Commercial",
    size: "6 acres",
    signal: "Potential redevelopment",
    why: "The location and existing commercial use make this example worth checking for redevelopment.",
    check: "Confirm permitted use, site constraints, and owner interest.",
    source:
      "Example parcel data and zoning map. The owner's interest in selling and the site's development potential still need checking.",
    x: 78,
    y: 70,
  },
];

export function PropertySearcher() {
  const [filter, setFilter] = useState<"All" | SiteKind>("All");
  const [selected, setSelected] = useState("A");
  const [saved, setSaved] = useState<string[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const sites = exampleSites.filter(
    (site) =>
      (filter === "All" || site.kind === filter) &&
      (!onlySaved || saved.includes(site.id)),
  );
  const active = sites.find((site) => site.id === selected) ?? sites[0];
  function toggleSave(id: string) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  return (
    <div className={styles.scout}>
      <div className={styles.demoTop}>
        <span>
          <MapPin size={16} /> Property Searcher
        </span>
        <DemoLabel>Proposed system / sample sites</DemoLabel>
      </div>
      <div className={styles.scoutToolbar}>
        <div
          className={styles.filterGroup}
          aria-label="Filter sample opportunities"
        >
          <SlidersHorizontal size={16} />
          {(["All", "Land", "Apartments", "Commercial"] as const).map(
            (kind) => (
              <button
                key={kind}
                aria-pressed={filter === kind}
                onClick={() => {
                  setFilter(kind);
                  setEvidence(false);
                }}
              >
                {kind}
              </button>
            ),
          )}
        </div>
        <button
          className={styles.savedButton}
          aria-pressed={onlySaved}
          onClick={() => setOnlySaved(!onlySaved)}
        >
          <Bookmark size={15} /> Saved ({saved.length})
        </button>
      </div>
      <div className={styles.scoutBody}>
        <div className={styles.map}>
          <svg
            viewBox="0 0 500 420"
            preserveAspectRatio="none"
            aria-hidden
            className={styles.mapDrawing}
          >
            <defs>
              <pattern
                id="skorman-map-grid"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M36 0H0V36"
                  fill="none"
                  stroke="#252b2b"
                  strokeWidth=".6"
                />
              </pattern>
            </defs>
            <rect width="500" height="420" fill="url(#skorman-map-grid)" />
            <path
              d="M32 94Q65 64 106 89T149 153Q134 190 83 181T28 140Z M-20 270Q70 223 116 268T153 365L40 430H0Z M357 -20Q378 26 440 41L520 67V-20Z"
              fill="#17282e"
              stroke="#28404a"
            />
            <g fill="none" stroke="#3b403e" strokeWidth="2">
              <path d="M-30 218L95 218 183 155 502 155 M126 0V99L240 245 240 430 M0 365L141 365 380 300 510 300 M343 0V108L437 220 437 430" />
              <path
                d="M-10 47L173 47 282 109 514 109 M0 310H89L179 262 500 262"
                strokeWidth="1"
              />
            </g>
            <path
              d="M520 395L332 218Q288 169 303 111L340 -20"
              fill="none"
              stroke="#555b52"
              strokeWidth="8"
            />
            <path
              d="M520 395L332 218Q288 169 303 111L340 -20"
              fill="none"
              stroke="#999d8c"
              strokeWidth="1"
              strokeDasharray="5 8"
            />
            <g
              fill="none"
              stroke="#535b47"
              strokeWidth="1"
              strokeDasharray="3 5"
            >
              <path d="M264 82h80v81h-80z M153 221h77v67h-77z M354 273h62v53h-62z" />
            </g>
          </svg>
          <span className={styles.mapPlace} style={{ left: "17%", top: "45%" }}>
            Lake County
          </span>
          <span className={styles.mapPlace} style={{ left: "58%", top: "86%" }}>
            Orange County
          </span>
          <span className={styles.mapCompass}>
            N<ArrowDown size={13} />
          </span>
          <AnimatePresence>
            {sites.map((site) => (
              <motion.button
                key={site.id}
                initial={{ scale: 0.65, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.65, opacity: 0 }}
                className={styles.mapPin}
                data-active={active?.id === site.id}
                style={{ left: `${site.x}%`, top: `${site.y}%` }}
                onClick={() => {
                  setSelected(site.id);
                  setEvidence(false);
                }}
                aria-label={`View ${site.name}`}
                aria-pressed={active?.id === site.id}
              >
                {site.id}
                {saved.includes(site.id) && <i aria-label="Saved" />}
              </motion.button>
            ))}
          </AnimatePresence>
          <span className={styles.mapLegend}>
            Schematic map. All sites are fictional.
          </span>
        </div>
        <div className={styles.siteDetails} aria-live="polite">
          {active ? (
            <>
              <div className={styles.siteHeading}>
                <span className={styles.siteLetter}>{active.id}</span>
                <span>
                  {active.kind}
                  <small>{active.size} / example</small>
                </span>
              </div>
              <h3>{active.name}</h3>
              <span className={styles.signal}>{active.signal}</span>
              <p>{active.why}</p>
              <div className={styles.checkNote}>
                <span>What still needs checking</span>
                {active.check}
              </div>
              <button
                className={styles.evidenceButton}
                onClick={() => setEvidence(!evidence)}
                aria-expanded={evidence}
              >
                <FileText size={15} />
                {evidence ? "Hide example evidence" : "Why this site?"}
                <ChevronRight size={15} />
              </button>
              {evidence && (
                <p className={styles.evidenceText}>{active.source}</p>
              )}
              <button
                className={styles.primarySmall}
                onClick={() => toggleSave(active.id)}
              >
                {saved.includes(active.id) ? (
                  <Check size={17} />
                ) : (
                  <Bookmark size={17} />
                )}
                {saved.includes(active.id)
                  ? "Saved to shortlist"
                  : "Save to shortlist"}
              </button>
            </>
          ) : (
            <div className={styles.emptyState}>
              <Bookmark size={26} />
              <h3>No saved sites in this view.</h3>
              <p>Explore the sample sites and save an opportunity.</p>
              <button
                className={styles.textButton}
                onClick={() => {
                  setOnlySaved(false);
                  setFilter("All");
                }}
              >
                Show all examples <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className={styles.scoutBottom}>
        <span>
          {sites.length} example {sites.length === 1 ? "site" : "sites"} in view
        </span>
        <button
          onClick={() => {
            setFilter("All");
            setSelected("A");
            setSaved([]);
            setOnlySaved(false);
            setEvidence(false);
          }}
        >
          Reset demo
        </button>
      </div>
    </div>
  );
}

const decisions = [
  {
    project: "Example retail phase",
    title: "Confirm the revised access plan",
    owner: "Development lead",
    due: "Before the next design review",
    kind: "Decision needed",
    update:
      "The proposed access route overlaps the loading area. The development lead needs to choose an arrangement before the drawings move ahead.",
    source: "Sample consultant update",
    excerpt:
      "The revised access route overlaps the loading area. Please confirm the preferred arrangement before the next design review.",
  },
  {
    project: "Example apartment opening",
    title: "Confirm the opening information",
    owner: "Marketing + property operator",
    due: "Before publishing",
    kind: "Follow-up",
    update:
      "The website draft and operator update disagree about the opening. Marketing and the operator need to approve the same information before it goes online.",
    source: "Sample operator update",
    excerpt:
      "The opening information hasn't been approved. Marketing and the property operator need to check the website draft together before publishing it.",
  },
  {
    project: "Example acquisition",
    title: "Finish the zoning review",
    owner: "Acquisitions lead",
    due: "Before site selection",
    kind: "Review",
    update:
      "The site fits the location criteria, but the zoning review is still open. Acquisitions needs to confirm the permitted use before recommending it.",
    source: "Sample acquisition note",
    excerpt:
      "The site passes the location screen. Please confirm the permitted use and required approvals before recommending it for further review.",
  },
];

export function OversightDemo() {
  const [assembled, setAssembled] = useState(false);
  const [selected, setSelected] = useState(0);
  const [sourceOpen, setSourceOpen] = useState(false);
  const active = decisions[selected];
  return (
    <div className={styles.briefDemo}>
      <div className={styles.demoTop}>
        <span>A weekly project brief</span>
        <DemoLabel>Proposed workflow / sample updates</DemoLabel>
      </div>
      <LayoutGroup id="skorman-brief">
        <AnimatePresence mode="popLayout" initial={false}>
          {!assembled ? (
            <motion.div
              key="scattered"
              className={styles.scattered}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.documentPile} aria-hidden>
                {["Consultant update", "Meeting notes", "Operator report"].map(
                  (name, index) => (
                    <motion.div
                      key={name}
                      layoutId={`brief-source-${index}`}
                      initial={{ y: 30, rotate: 0 }}
                      animate={{ y: 0, rotate: (index - 1) * 9 }}
                      transition={{ duration: 0.45, delay: index * 0.08 }}
                    >
                      <FileText size={28} />
                      <span>{name}</span>
                      <i />
                      <i />
                      <i />
                    </motion.div>
                  ),
                )}
              </div>
              <h3>Start with the reports you have.</h3>
              <p>Pull out the decisions that are still waiting on someone.</p>
              <button
                className={styles.primarySmall}
                onClick={() => setAssembled(true)}
              >
                Build the sample brief <ArrowRight size={17} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="brief"
              className={styles.assembledBrief}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.briefTitle}>
                <div>
                  <span className={styles.smallLabel}>
                    Your weekly project brief
                  </span>
                  <h3>Three items need a follow-up.</h3>
                </div>
                <span className={styles.briefCount}>3</span>
              </div>
              <div className={styles.decisionGrid}>
                <div className={styles.decisionList}>
                  {decisions.map((item, index) => (
                    <motion.button
                      layoutId={`brief-source-${index}`}
                      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                      key={item.title}
                      aria-pressed={selected === index}
                      onClick={() => {
                        setSelected(index);
                        setSourceOpen(false);
                      }}
                    >
                      <span>{item.project}</span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.kind}
                        <ChevronRight size={15} />
                      </small>
                    </motion.button>
                  ))}
                </div>
                <div className={styles.decisionDetail} aria-live="polite">
                  <span className={styles.smallLabel}>What changed</span>
                  <p>{active.update}</p>
                  <dl>
                    <div>
                      <dt>Owner</dt>
                      <dd>{active.owner}</dd>
                    </div>
                    <div>
                      <dt>Next checkpoint</dt>
                      <dd>{active.due}</dd>
                    </div>
                  </dl>
                  <button
                    className={styles.evidenceButton}
                    aria-expanded={sourceOpen}
                    onClick={() => setSourceOpen(!sourceOpen)}
                  >
                    <FileText size={15} />
                    {active.source}
                    <ChevronRight size={15} />
                  </button>
                  {sourceOpen && (
                    <blockquote className={styles.sourceQuote}>
                      {active.excerpt}
                      <footer>
                        Fictional source excerpt for this demonstration.
                      </footer>
                    </blockquote>
                  )}
                </div>
              </div>
              <button
                className={styles.resetLink}
                onClick={() => {
                  setAssembled(false);
                  setSourceOpen(false);
                }}
              >
                Show the reports again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}

const answers = [
  {
    question: "What's holding up the drawings?",
    answer:
      "The access route overlaps the loading area. The drawings are waiting for the development lead to choose an arrangement.",
    next: "Confirm the access arrangement before the next design review.",
    source: "Consultant update",
    excerpt: decisions[0].excerpt,
  },
  {
    question: "Has the opening information been approved?",
    answer:
      "There's no approved opening statement in the sample files. The website draft and operator update still disagree.",
    next: "Ask marketing and the property operator to approve the same information before publishing.",
    source: "Operator update",
    excerpt: decisions[1].excerpt,
  },
  {
    question: "What still needs checking on the new site?",
    answer:
      "The site passes the location screen. The sample record still needs confirmation of the permitted use and required approvals.",
    next: "Ask the acquisitions lead to finish and record the zoning review before selecting the site.",
    source: "Acquisition note",
    excerpt: decisions[2].excerpt,
  },
];

export function AnswersDemo() {
  const [selected, setSelected] = useState(0);
  const [sourceOpen, setSourceOpen] = useState(false);
  const active = answers[selected];
  return (
    <div className={styles.answersDemo}>
      <div className={styles.demoTop}>
        <span>
          <Search size={16} /> Ask about a project
        </span>
        <DemoLabel>Prepared example answers</DemoLabel>
      </div>
      <div className={styles.questions} aria-label="Try a project question">
        {answers.map((answer, index) => (
          <button
            key={answer.question}
            aria-pressed={selected === index}
            onClick={() => {
              setSelected(index);
              setSourceOpen(false);
            }}
          >
            {answer.question}
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          className={styles.answerContent}
          key={selected}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span className={styles.answerLabel}>
            <span /> In the project record
          </span>
          <p className={styles.answerText}>{active.answer}</p>
          <div className={styles.nextAction}>
            <ArrowRight size={19} />
            <p>{active.next}</p>
          </div>
          <button
            className={styles.citationButton}
            aria-expanded={sourceOpen}
            onClick={() => setSourceOpen(!sourceOpen)}
          >
            <span>1</span>
            {active.source}
            <FileText size={15} />
          </button>
          {sourceOpen && (
            <div className={styles.sourceDocument}>
              <div>
                <FileText size={18} />
                <strong>{active.source}</strong>
                <button
                  onClick={() => setSourceOpen(false)}
                  aria-label="Close source excerpt"
                >
                  <X size={16} />
                </button>
              </div>
              <p>{active.excerpt}</p>
              <small>Fictional note. No Skorman documents are connected.</small>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className={styles.answerFooter}>
        <Check size={15} /> Answers link to the documents each person is allowed
        to see.
      </div>
    </div>
  );
}
