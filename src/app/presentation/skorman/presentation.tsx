"use client";

import Image from "next/image";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  Layers3,
  List,
  Maximize2,
  MessageSquare,
  Minimize2,
  Route,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnswersDemo,
  OversightDemo,
  PropertySearcher,
  VisibilityDemo,
} from "./demos";
import { chapters, properties, sources } from "./content";
import styles from "./skorman.module.css";

type Panel = "chapters" | "notes" | "sources";
type Navigate = (index: number) => void;

function SceneIntro({
  tag,
  title,
  children,
  extra,
}: {
  tag: string;
  title: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className={styles.sceneIntro}>
      <p className={styles.chapterTag}>{tag}</p>
      <h2 data-scene-heading tabIndex={-1}>
        {title}
      </h2>
      <div className={styles.introCopy}>{children}</div>
      {extra}
    </div>
  );
}

function Cover({ goTo }: { goTo: Navigate }) {
  return (
    <section className={`${styles.scene} ${styles.cover}`}>
      <div className={styles.coverCopy}>
        <p className={styles.chapterTag}>
          A conversation with Skorman Development
        </p>
        <h1 data-scene-heading tabIndex={-1}>
          A clearer view
          <br />
          of what
          <br />
          comes next.
        </h1>
        <p>
          Find promising sites. Bring people to your properties. Keep every
          project in view.
        </p>
        <button className={styles.primaryButton} onClick={() => goTo(1)}>
          Explore the opportunity <ArrowRight size={19} />
        </button>
        <span className={styles.coverNote}>
          Built around your business. By Pontian.
        </span>
      </div>
      <motion.div
        className={styles.coverImage}
        initial={{ clipPath: "inset(0 10% 0 0)", opacity: 0 }}
        animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
        transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Image
          src="/presentation/skorman/hills-city-center.png"
          alt="Skorman's development visualization for Hills City Center"
          fill
          sizes="(max-width: 800px) 100vw, 65vw"
          priority
        />
        <div className={styles.coverShade} />
        <div className={styles.coverCoordinates}>
          <span>Hills City Center</span>
          <span>Minneola, Florida</span>
        </div>
        <div className={styles.coverLinks}>
          {[
            { label: "Get discovered", index: 2 },
            { label: "Find the next site", index: 3 },
            { label: "See the bigger picture", index: 4 },
          ].map((item, i) => (
            <button key={item.label} onClick={() => goTo(item.index)}>
              <span className={styles.colorDot} data-tone={i} />
              {item.label}
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
        <span className={styles.imageCredit}>
          Developer visualization / future residential phase
        </span>
      </motion.div>
    </section>
  );
}

function Portfolio() {
  const [selected, setSelected] = useState(0);
  const property = properties[selected];
  return (
    <section className={`${styles.scene} ${styles.split}`}>
      <SceneIntro
        tag="Built around Skorman"
        title={
          <>
            One portfolio.
            <br />
            Different priorities.
          </>
        }
        extra={
          <p className={styles.assetTypes}>
            Apartments, retail, mixed-use, industrial, and hospitality.
          </p>
        }
      >
        <p>
          Every property has a next chapter. The right system starts with the
          people and decisions that move it forward.
        </p>
        <div
          className={styles.propertySelector}
          aria-label="Explore Skorman properties"
        >
          {properties.map((item, index) => (
            <button
              key={item.name}
              onClick={() => setSelected(index)}
              aria-pressed={selected === index}
            >
              <span>
                <strong>{item.name}</strong>
                <small>{item.kind}</small>
              </span>
              <ArrowUpRight size={21} />
            </button>
          ))}
        </div>
      </SceneIntro>
      <div className={styles.propertyVisual}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.propertyImage}>
              <Image
                src={`/presentation/skorman/${property.image}`}
                alt={property.credit}
                fill
                sizes="(max-width: 800px) 100vw, 55vw"
              />
              <div className={styles.propertyImageShade} />
              <div className={styles.propertyStat}>
                <strong>{property.stat}</strong>
                <span>{property.unit}</span>
              </div>
            </div>
            <div className={styles.propertyCaption}>
              <span className={styles.statusPill}>{property.status}</span>
              <h3>{property.opportunity}</h3>
              <p>{property.detail}</p>
              <a href={property.source} target="_blank" rel="noreferrer">
                View property source <ArrowUpRight size={14} />
              </a>
            </div>
            <p className={styles.finePrint}>{property.credit}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function Visibility() {
  return (
    <section className={`${styles.scene} ${styles.split}`}>
      <SceneIntro
        tag="Search visibility / GEO + SEO"
        title={
          <>
            Be there when
            <br />
            the search begins.
          </>
        }
        extra={
          <div className={styles.outcome}>
            <span className={styles.colorDot} data-tone={0} />
            <p>The goal: more relevant people taking the right next step.</p>
          </div>
        }
      >
        <p>
          Make your properties easier to discover in Google and AI answers. Then
          make it easy to visit, inquire, or reach the right team.
        </p>
        <dl className={styles.definitions}>
          <div>
            <dt>SEO</dt>
            <dd>Help search engines find and understand each property.</dd>
          </div>
          <div>
            <dt>GEO</dt>
            <dd>Help AI answers describe and recommend it accurately.</dd>
          </div>
        </dl>
      </SceneIntro>
      <VisibilityDemo />
    </section>
  );
}

function Searcher() {
  return (
    <section className={`${styles.scene} ${styles.split} ${styles.wideDemo}`}>
      <SceneIntro
        tag="Acquisitions / Property Searcher"
        title={
          <>
            Your next site.
            <br />A little easier
            <br />
            to spot.
          </>
        }
        extra={
          <div className={styles.outcome}>
            <span className={styles.colorDot} data-tone={1} />
            <p>A shortlist with reasons. Your team makes the call.</p>
          </div>
        }
      >
        <p>
          Bring newly available properties and signs of potential value into one
          place, matched to what Skorman wants to develop.
        </p>
        <ul className={styles.plainList}>
          <li>New listings and foreclosure notices</li>
          <li>Recorded sales and parcel details</li>
          <li>Zoning, access, and site constraints</li>
        </ul>
        <p className={styles.secondaryCopy}>
          Start with Central Florida land, apartments, and commercial sites.
          Confirm value through further review.
        </p>
      </SceneIntro>
      <PropertySearcher />
    </section>
  );
}

function Oversight() {
  return (
    <section className={`${styles.scene} ${styles.split} ${styles.wideDemo}`}>
      <SceneIntro
        tag="Development / A simpler weekly brief"
        title={
          <>
            Open Monday.
            <br />
            Know what
            <br />
            needs you.
          </>
        }
        extra={
          <div className={styles.outcome}>
            <span className={styles.colorDot} data-tone={2} />
            <p>Less chasing updates. More time for decisions.</p>
          </div>
        }
      >
        <p>
          Turn approved meeting notes, consultant updates, and operator reports
          into a clear view of what changed.
        </p>
        <div className={styles.questionList}>
          <span>What needs a decision?</span>
          <span>Who owns the next step?</span>
          <span>Where did the update come from?</span>
        </div>
      </SceneIntro>
      <OversightDemo />
    </section>
  );
}

function Answers() {
  return (
    <section className={`${styles.scene} ${styles.split}`}>
      <SceneIntro
        tag="Company knowledge / Answers with evidence"
        title={
          <>
            Ask the question.
            <br />
            Find the answer.
          </>
        }
        extra={
          <div className={styles.outcome}>
            <FileText size={22} />
            <p>Open the source behind any answer.</p>
          </div>
        }
      >
        <p>
          Give the team a simple way to find the latest decision, project note,
          or open question without searching across folders and emails.
        </p>
        <p className={styles.secondaryCopy}>
          Connect approved information. Keep existing permissions. Make missing
          or conflicting information visible.
        </p>
      </SceneIntro>
      <AnswersDemo />
    </section>
  );
}

const foundations = [
  {
    label: "Canes",
    status: "Existing workflow software",
    title: "From a first inquiry to getting the work done.",
    text: "Pontian's Canes work connects lead intake, conversations, scheduling, and invoicing around the day-to-day work of a service business.",
    takeaway:
      "For Skorman: a clear owner and next action for every commercial inquiry.",
    steps: ["Inquiry", "Conversation", "Scheduled work", "Invoice"],
    icon: MessageSquare,
  },
  {
    label: "Across locations",
    status: "Existing reporting foundation",
    title: "Compare locations in one view.",
    text: "Our retail reporting work brings data from multiple locations into a common view. The useful pattern is consistent information that an owner can compare.",
    takeaway:
      "For Skorman: build a comparable owner report from approved property-manager reports.",
    steps: ["Location reports", "Consistent measures", "Compare", "Review"],
    icon: Layers3,
  },
  {
    label: "Company knowledge",
    status: "Existing knowledge foundation",
    title: "Keep the source close to the answer.",
    text: "Our knowledge systems retrieve company information with source citations and access controls. Connecting Skorman's information would be new work.",
    takeaway:
      "For Skorman: project answers that lead back to the approved record.",
    steps: ["Approved files", "Your question", "A clear answer", "The source"],
    icon: FileText,
  },
  {
    label: "Project changes",
    status: "Demonstration / simulated integrations",
    title: "See who a change affects.",
    text: "Our engineering demonstration follows a change through affected teams, tasks, and reviews. It shows an interaction pattern we could adapt together.",
    takeaway: "For Skorman: a change becomes a visible decision with an owner.",
    steps: ["A change", "Affected teams", "Review", "Decision"],
    icon: Route,
  },
];

function Experience() {
  const [selected, setSelected] = useState(0);
  const foundation = foundations[selected];
  const Icon = foundation.icon;
  return (
    <section className={`${styles.scene} ${styles.experience}`}>
      <div className={styles.experienceHeading}>
        <SceneIntro
          tag="The experience behind the proposal"
          title={
            <>
              A foundation
              <br />
              to build on.
            </>
          }
        >
          <p>
            We build around real work, then stay involved to maintain and
            improve the systems.
          </p>
        </SceneIntro>
        <p className={styles.experienceAside}>
          A familiar starting point.
          <br />
          <strong>Our work with Sebastian at Canes.</strong>
        </p>
      </div>
      <div
        className={styles.foundationTabs}
        aria-label="Explore relevant Pontian experience"
      >
        {foundations.map((item, index) => (
          <button
            key={item.label}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {item.label}
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selected}
          className={styles.foundationContent}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.foundationCopy}>
            <span className={styles.statusPill}>{foundation.status}</span>
            <h3>{foundation.title}</h3>
            <p>{foundation.text}</p>
          </div>
          <div className={styles.workflow}>
            <Icon size={34} strokeWidth={1.3} />
            <div className={styles.workflowSteps}>
              {foundation.steps.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                  {index < 3 && <ArrowRight size={17} />}
                </motion.div>
              ))}
            </div>
            <p>{foundation.takeaway}</p>
          </div>
        </motion.div>
      </AnimatePresence>
      <p className={styles.finePrint}>
        These are foundations and experience. The Skorman systems shown here are
        proposals, not existing integrations.
      </p>
    </section>
  );
}

const horizons = [
  {
    name: "One useful starting point",
    title: "Make one property easier to discover.",
    body: "Begin with a defined property, accurate information, and a measurable path to an inquiry or visit.",
    result: "A focused result the team can use.",
    active: 1,
  },
  {
    name: "A connected portfolio",
    title: "Bring opportunities and projects into view.",
    body: "Add an acquisition shortlist and a shared development brief. Connect approved reports from the tools your teams already use.",
    result: "A consistent view across properties and stages.",
    active: 4,
  },
  {
    name: "Knowledge that compounds",
    title: "Carry every project's lessons into the next.",
    body: "Compare the original site assumptions with approvals, delivery, and operating results. Keep the reasoning behind the decisions.",
    result: "A record that stays useful long after a project opens.",
    active: 5,
  },
];

function Horizon() {
  const [selected, setSelected] = useState(0);
  const horizon = horizons[selected];
  const lifecycle = [
    { name: "Find", x: 85, y: 220 },
    { name: "Plan", x: 200, y: 95 },
    { name: "Build", x: 390, y: 95 },
    { name: "Operate", x: 505, y: 220 },
    { name: "Learn", x: 295, y: 342 },
  ];
  return (
    <section className={`${styles.scene} ${styles.horizon}`}>
      <div className={styles.horizonTop}>
        <SceneIntro
          tag="The longer view"
          title={
            <>
              Every project.
              <br />A stronger starting point.
            </>
          }
        >
          <p>
            A shared record from the first site review to the lessons you take
            into the next development.
          </p>
        </SceneIntro>
        <span className={styles.horizonCaption}>
          A long-term partnership.
          <br />
          Built one useful system at a time.
        </span>
      </div>
      <div className={styles.horizonLayout}>
        <div
          className={styles.horizonOptions}
          aria-label="Explore the long-term vision"
        >
          {horizons.map((item, index) => (
            <button
              key={item.name}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <span>0{index + 1}</span>
              <div>
                <strong>{item.name}</strong>
                {selected === index && <p>{item.body}</p>}
              </div>
              <ChevronRight size={20} />
            </button>
          ))}
        </div>
        <div className={styles.lifecycle}>
          <svg
            viewBox="0 0 590 430"
            role="img"
            aria-label="A property record connects finding, planning, building, operating, and learning"
          >
            <path
              className={styles.lifecycleTrack}
              d="M85 220L200 95H390L505 220L295 342Z"
            />
            <motion.path
              className={styles.lifecycleProgress}
              d="M85 220L200 95H390L505 220L295 342Z"
              initial={false}
              animate={{ pathLength: horizon.active / 5 }}
              transition={{ duration: 0.65, ease: "easeInOut" }}
            />
            <circle cx="295" cy="216" r="53" className={styles.recordCircle} />
            <text
              x="295"
              y="211"
              textAnchor="middle"
              className={styles.recordText}
            >
              One property
            </text>
            <text
              x="295"
              y="232"
              textAnchor="middle"
              className={styles.recordText}
            >
              record
            </text>
            {lifecycle.map((item, index) => (
              <g
                key={item.name}
                className={styles.lifecycleNode}
                data-active={index < horizon.active}
              >
                <path d={`M295 216L${item.x} ${item.y}`} />
                <circle cx={item.x} cy={item.y} r="26" />
                <text x={item.x} y={item.y + 5} textAnchor="middle">
                  {index + 1}
                </text>
                <text
                  x={item.x}
                  y={item.y + 49}
                  textAnchor="middle"
                  className={styles.lifecycleName}
                >
                  {item.name}
                </text>
              </g>
            ))}
          </svg>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={selected}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className={styles.colorDot} data-tone={selected} />
              {horizon.result}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

const startingPoints = [
  {
    name: "Property visibility",
    property: "Suggested start: Hills City Center",
    people: "Property lead + marketing owner",
    bring:
      "Current website, approved property details, and existing inquiry paths.",
    result:
      "Agree on the pages, visitor actions, and visibility measures for a first pilot.",
  },
  {
    name: "Acquisition search",
    property: "Suggested start: Central Florida criteria",
    people: "Acquisitions lead + a site evaluator",
    bring:
      "Target areas, property types, site criteria, and examples of good past opportunities.",
    result:
      "Define what deserves a place on the shortlist and which sources can support it.",
  },
  {
    name: "Development brief",
    property: "Suggested start: One active project",
    people: "Development lead + the report owner",
    bring:
      "An approved meeting record, project update, and the current reporting process.",
    result:
      "Agree on a brief that makes the next decision and its owner clear.",
  },
];

function NextStep() {
  const [selected, setSelected] = useState(0);
  const focus = startingPoints[selected];
  return (
    <section className={`${styles.scene} ${styles.split} ${styles.close}`}>
      <SceneIntro
        tag="Let's put it to work"
        title={
          <>
            Start with one property.
            <br />
            Keep the whole
            <br />
            portfolio in view.
          </>
        }
      >
        <p>
          One working session. The people who know the process. A useful first
          result we can define together.
        </p>
        <ol className={styles.nextSteps}>
          <li>
            <span>01</span>Choose the property and the outcome.
          </li>
          <li>
            <span>02</span>Walk through how it works today.
          </li>
          <li>
            <span>03</span>Agree on a focused, measurable pilot.
          </li>
        </ol>
      </SceneIntro>
      <div className={styles.sessionCard}>
        <div className={styles.sessionHeader}>
          <span className={styles.colorDot} data-tone={0} />
          The first working session
        </div>
        <h3>Where should we begin?</h3>
        <div
          className={styles.sessionChoices}
          aria-label="Choose a working session focus"
        >
          {startingPoints.map((point, index) => (
            <button
              key={point.name}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <span>{point.name}</span>
              {selected === index ? (
                <Check size={17} />
              ) : (
                <ArrowUpRight size={17} />
              )}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className={styles.sessionAgenda}
            key={selected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <span>{focus.property}</span>
            <dl>
              <div>
                <dt>Who joins Pontian</dt>
                <dd>{focus.people}</dd>
              </div>
              <div>
                <dt>What we walk through</dt>
                <dd>{focus.bring}</dd>
              </div>
              <div>
                <dt>What we leave with</dt>
                <dd>{focus.result}</dd>
              </div>
            </dl>
          </motion.div>
        </AnimatePresence>
        <p className={styles.sessionFoot}>
          A starting point for the conversation.
        </p>
      </div>
    </section>
  );
}

export function SkormanPresentation() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [panel, setPanel] = useState<Panel>("chapters");
  const [notesIndex, setNotesIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const focusAfterNavigation = useRef(false);
  const reduced = useReducedMotion();

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(chapters.length - 1, index));
      dialog.current?.close();
      if (next === active) return;
      setDirection(next > active ? 1 : -1);
      setActive(next);
      focusAfterNavigation.current = true;
      history.replaceState(null, "", `#${chapters[next].id}`);
    },
    [active],
  );

  useEffect(() => {
    const readHash = () => {
      const index = chapters.findIndex(
        (chapter) => `#${chapter.id}` === window.location.hash,
      );
      if (index >= 0) {
        focusAfterNavigation.current = true;
        setActive(index);
      }
    };
    const frame = requestAnimationFrame(readHash);
    window.addEventListener("hashchange", readHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", readHash);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        dialog.current?.open ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "button, a, input, select, textarea, [contenteditable=true], [role=tab]",
        )
      )
        return;
      if (["ArrowRight", "PageDown"].includes(event.key)) {
        event.preventDefault();
        goTo(active + 1);
      }
      if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goTo(active - 1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        goTo(chapters.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function openPanel(next: Panel) {
    setPanel(next);
    setNotesIndex(active);
    dialog.current?.showModal();
  }
  async function toggleFullscreen() {
    try {
      setFullscreenError("");
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen)
        await root.current.requestFullscreen();
      else
        setFullscreenError(
          "Use your browser's full-screen control on this device.",
        );
    } catch {
      setFullscreenError(
        "Full screen is unavailable here. Use your browser's full-screen control.",
      );
    }
  }
  function onSceneReady() {
    if (!focusAfterNavigation.current) return;
    main.current?.scrollTo({ top: 0 });
    main.current
      ?.querySelector<HTMLElement>("[data-scene-heading]")
      ?.focus({ preventScroll: true });
    focusAfterNavigation.current = false;
  }
  const scenes = [
    <Cover key="cover" goTo={goTo} />,
    <Portfolio key="portfolio" />,
    <Visibility key="visibility" />,
    <Searcher key="searcher" />,
    <Oversight key="oversight" />,
    <Answers key="answers" />,
    <Experience key="experience" />,
    <Horizon key="horizon" />,
    <NextStep key="next" />,
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div ref={root} className={styles.root}>
        <a href="#skorman-content" className={styles.skip}>
          Skip to presentation
        </a>
        <header className={styles.header}>
          <button
            className={styles.brand}
            onClick={() => goTo(0)}
            aria-label="Pontian presentation, return to beginning"
          >
            <Image
              src="/pontian/frontier-logo.png"
              alt="Pontian"
              width={56}
              height={56}
              unoptimized
              priority
            />
          </button>
          <div className={styles.headerTitle}>
            <span>For Skorman Development</span>
            <span>A view of what&apos;s possible</span>
          </div>
          <nav className={styles.headerTools} aria-label="Presentation tools">
            <button aria-label="Chapters" onClick={() => openPanel("chapters")}>
              <List size={18} />
              <span>Chapters</span>
            </button>
            <button
              aria-label="Presenter notes"
              onClick={() => openPanel("notes")}
            >
              <BookOpen size={18} />
              <span>Presenter notes</span>
            </button>
            <button
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
            >
              {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </nav>
        </header>
        {fullscreenError && (
          <div className={styles.fullscreenNotice} role="status">
            {fullscreenError}
            <button
              onClick={() => setFullscreenError("")}
              aria-label="Dismiss full-screen message"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <main
          ref={main}
          id="skorman-content"
          className={styles.main}
          tabIndex={-1}
        >
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              className={styles.sceneWrap}
              key={active}
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 24 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * -16 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: reduced ? 0 : 0.24,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              onAnimationComplete={(definition) => {
                if (definition === "center") onSceneReady();
              }}
            >
              {scenes[active]}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className={styles.footer}>
          <div className={styles.footerMeta}>
            <span>
              <strong>{String(active + 1).padStart(2, "0")}</strong> /{" "}
              {String(chapters.length).padStart(2, "0")}
            </span>
            <button onClick={() => openPanel("sources")}>
              Sources & context <ArrowUpRight size={12} />
            </button>
          </div>
          <nav
            className={styles.progressNav}
            aria-label="Presentation chapters"
          >
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                onClick={() => goTo(index)}
                aria-label={`Chapter ${index + 1}: ${chapter.label}`}
                aria-current={active === index ? "step" : undefined}
                data-complete={index < active}
                title={chapter.label}
              >
                <span />
                <small>{chapter.label}</small>
              </button>
            ))}
          </nav>
          <div className={styles.footerActions}>
            <button
              className={styles.previous}
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Previous chapter"
            >
              <ArrowLeft size={19} />
            </button>
            <button
              className={styles.next}
              onClick={() =>
                goTo(active === chapters.length - 1 ? 0 : active + 1)
              }
            >
              {active === 0
                ? "Begin"
                : active === chapters.length - 1
                  ? "Start again"
                  : "Next"}
              <ArrowRight size={19} />
            </button>
          </div>
        </footer>
        <span className={styles.srOnly} role="status" aria-live="polite">
          Chapter {active + 1} of {chapters.length}: {chapters[active].label}
        </span>
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby="skorman-panel-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) dialog.current?.close();
          }}
        >
          <div className={styles.dialogInner}>
            <div className={styles.dialogHeader}>
              <h2 id="skorman-panel-title">
                {panel === "chapters"
                  ? "Explore the conversation"
                  : panel === "notes"
                    ? "Sebastian's presenter notes"
                    : "Sources & context"}
              </h2>
              <button
                aria-label="Close panel"
                onClick={() => dialog.current?.close()}
              >
                <X size={22} />
              </button>
            </div>
            {panel === "chapters" && (
              <>
                <p className={styles.dialogLead}>
                  A guided conversation in nine chapters. About 8–10 minutes,
                  with room to explore.
                </p>
                <div className={styles.chapterMenu}>
                  {chapters.map((chapter, index) => (
                    <button
                      key={chapter.id}
                      onClick={() => goTo(index)}
                      aria-current={active === index ? "step" : undefined}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{chapter.label}</strong>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                </div>
                <p className={styles.dialogHint}>
                  Use the left and right arrow keys to move between chapters. On
                  smaller screens, scroll within each chapter.
                </p>
              </>
            )}
            {panel === "notes" && (
              <>
                <p className={styles.dialogLead}>
                  Suggested talking points, not a script to memorize. Visible on
                  this screen while open.
                </p>
                <div className={styles.presenterCurrent}>
                  <span>
                    Chapter {notesIndex + 1} / {chapters[notesIndex].time}
                  </span>
                  <h3>{chapters[notesIndex].label}</h3>
                  <h4>Say it simply</h4>
                  <p>{chapters[notesIndex].say}</p>
                  <h4>Show it</h4>
                  <p>{chapters[notesIndex].do}</p>
                </div>
                <div className={styles.notesNavigation}>
                  <button
                    onClick={() => {
                      setNotesIndex(Math.max(0, notesIndex - 1));
                    }}
                    disabled={notesIndex === 0}
                  >
                    <ArrowLeft size={16} /> Previous notes
                  </button>
                  <button
                    onClick={() => {
                      setNotesIndex(
                        Math.min(chapters.length - 1, notesIndex + 1),
                      );
                    }}
                    disabled={notesIndex === chapters.length - 1}
                  >
                    Next notes <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
            {panel === "sources" && (
              <>
                <p className={styles.dialogLead}>
                  Public property facts checked October 1, 2026. Project
                  descriptions and stages are attributed to their sources and
                  can change.
                </p>
                <div className={styles.contextNote}>
                  <h3>What you&apos;re looking at</h3>
                  <p>
                    The search results, acquisition sites, project updates, and
                    answers are illustrative. They do not show live feeds,
                    available deals, connected Skorman documents, or existing
                    Skorman integrations.
                  </p>
                  <p>
                    Property visuals come from Skorman&apos;s public website.
                    Development renderings do not establish completion. The
                    Pontian mark is the supplied, unchanged artwork.
                  </p>
                </div>
                <div className={styles.sourceList}>
                  {sources.map((source) => (
                    <a
                      key={source.href}
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div>
                        <strong>{source.label}</strong>
                        <p>{source.detail}</p>
                      </div>
                      <ArrowUpRight size={18} />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </dialog>
      </div>
    </MotionConfig>
  );
}
