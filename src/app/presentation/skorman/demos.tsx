"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import frontier from "@/app/(landing)/frontier.module.css";
import industry from "@/components/landing/industries.module.css";
import { sources, talkingPoints } from "./content";
import styles from "./skorman.module.css";

const parcels = [
  {
    id: "A",
    name: "Land for development",
    size: "22 acres",
    signal: "New listing",
    x: 38,
    y: 34,
    shape: "M275 106L395 93L419 179L317 205L281 164Z",
    why: "Matches the example team's preferred area, use, and size.",
    check: "Confirm access, utilities, and usable acreage.",
  },
  {
    id: "B",
    name: "Apartment property",
    size: "88 homes",
    signal: "Foreclosure notice",
    x: 65,
    y: 67,
    shape: "M500 279L593 250L663 313L620 382L524 360Z",
    why: "A public notice flags this example for a closer review.",
    check: "Verify case status, title, condition, and comparable sales.",
  },
  {
    id: "C",
    name: "Commercial infill",
    size: "6 acres",
    signal: "Possible redevelopment",
    x: 82,
    y: 26,
    shape: "M675 76L763 65L810 148L726 177L674 137Z",
    why: "The location and existing use fit the example search criteria.",
    check: "Confirm permitted use and the owner's interest in selling.",
  },
];

export function ParcelStudy() {
  const [selected, setSelected] = useState(0);
  const parcel = parcels[selected];
  return (
    <div className={styles.parcelStudy}>
      <div className={styles.mapFrame}>
        <svg
          viewBox="0 0 900 470"
          preserveAspectRatio="none"
          className={styles.parcelMap}
          aria-hidden
        >
          <defs>
            <pattern
              id="parcel-grid"
              width="45"
              height="47"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M45 0H0V47"
                fill="none"
                stroke="#fff"
                strokeOpacity=".07"
                strokeWidth=".6"
              />
            </pattern>
            <pattern
              id="parcel-hatch"
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(35)"
            >
              <path d="M0 0V7" stroke="#aaa" strokeWidth=".6" />
            </pattern>
          </defs>
          <rect width="900" height="470" fill="#111414" />
          <rect width="900" height="470" fill="url(#parcel-grid)" />
          <g fill="none" stroke="#353b39" strokeWidth="1">
            <path d="M-30 89Q85 22 191 75T259 230T81 343T-31 418 M-20 62Q95 0 213 60T285 241T87 362T-10 453 M-5 38Q117 -19 231 42T315 241T107 389T12 480 M12 22Q136 -39 251 25T342 247T133 415" />
            <path d="M550 -20Q529 82 635 107T806 257T920 298 M574 -20Q552 61 659 83T826 238T930 274 M602 -20Q581 38 689 61T852 218T952 249" />
          </g>
          <path
            d="M-20 192Q86 140 142 200T115 300Q45 327 -20 283Z"
            fill="#202a2d"
            stroke="#414c4d"
            strokeWidth=".8"
          />
          <path
            d="M672 381Q735 320 811 342L918 399V490H702Z"
            fill="url(#parcel-hatch)"
            opacity=".2"
          />
          <g fill="none" stroke="#6e7470">
            <path
              d="M214 -10L235 107 208 254 277 490 M216 -10L242 108 215 254 284 490"
              strokeWidth="1.2"
            />
            <path
              d="M-10 396L375 232 573 215 918 5 M-10 403L375 239 575 222 921 13"
              strokeWidth="1.5"
            />
            <path
              d="M239 106L391 93 463 46 M216 258L396 294 531 277 M572 219L662 312 900 328 M626 183L674 136 808 147"
              strokeWidth=".7"
            />
          </g>
          <g
            fill="none"
            stroke="#6f7670"
            strokeWidth=".7"
            strokeDasharray="3 4"
          >
            <path d="M264 261L353 224 396 294 284 342Z M437 118L499 77 563 141 500 191Z M667 215L755 181 788 260 727 286Z M334 351L404 321 450 409 379 442Z M789 335L849 337 873 403 807 418Z" />
          </g>
          {parcels.map((item, index) => (
            <path
              key={item.id}
              d={item.shape}
              fill={selected === index ? "#fdd90712" : "#ffffff03"}
              stroke={selected === index ? "#fdd907" : "#8a928c"}
              strokeWidth={selected === index ? "1.5" : ".8"}
              className={styles.parcelOutline}
            />
          ))}
        </svg>
        <div className={styles.mapTitle}>
          <span>Central Florida / Site research</span>
          <span>Illustrative map</span>
        </div>
        <span className={styles.north}>
          N<span>↑</span>
        </span>
        {parcels.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`View parcel ${item.id}: ${item.name}`}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
            className={styles.parcelMarker}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            {item.id}
          </button>
        ))}
        <div className={styles.mapBottom}>
          <span>Select a parcel to see why it appeared.</span>
          <span>All sites and figures are fictional.</span>
        </div>
      </div>
      <div className={styles.parcelInfo} aria-live="polite">
        <span className={styles.parcelLetter}>{parcel.id}</span>
        <div>
          <h3>{parcel.name}</h3>
          <span>
            {parcel.size} / {parcel.signal}
          </span>
        </div>
        <p>
          {parcel.why}
          <span>{parcel.check}</span>
        </p>
      </div>
    </div>
  );
}

const searches = [
  {
    label: "Visit",
    question: "Where can we take the kids near Clermont?",
    title: "Hills City Center",
    image: "hills-city-center.png",
    credit: "Hills City Center / Planned phase rendering",
    answer:
      "Hills City Center in Minneola includes Crooked Can and Splash & Play. Check current attractions and hours when planning your visit.",
    action: "Visitor information and directions",
    measure: "Directions and event clicks",
  },
  {
    label: "Live",
    question: "Apartments near the turnpike in Minneola?",
    title: "Minneola Hills",
    image: "minneola-hills.png",
    credit: "Minneola Hills / Property visual",
    answer:
      "The community's leasing website has floor plans and current availability, with a way to ask the leasing team about a tour.",
    action: "The existing leasing team's website",
    measure: "Leasing inquiries",
  },
  {
    label: "Lease",
    question: "Where could I open a business in Minneola?",
    title: "Skorman's commercial properties",
    image: "hills-city-center.png",
    credit: "Hills City Center / Planned phase rendering",
    answer:
      "Explore Skorman's retail and mixed-use developments. Contact the team for the property you're considering to confirm current or future space.",
    action: "The property's commercial contact",
    measure: "Relevant commercial inquiries",
  },
];

export function VisibilityExample() {
  const [selected, setSelected] = useState(0);
  const search = searches[selected];
  return (
    <div className={styles.discovery}>
      <div
        className={styles.discoveryTabs}
        aria-label="Choose a search example"
      >
        <span>Example search journeys</span>
        <div>
          {searches.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.discoveryBody}>
        <figure className={styles.discoveryImage}>
          <Image
            src={`/presentation/skorman/${search.image}`}
            alt={search.credit}
            fill
            loading="eager"
            sizes="(max-width: 700px) 100vw, 55vw"
            className={industry.noir}
          />
          <div className={styles.imageShade} />
          <figcaption>{search.credit}</figcaption>
        </figure>
        <div className={styles.discoveryCopy} aria-live="polite">
          <span className={styles.caption}>A question someone might ask</span>
          <h3>{search.question}</h3>
          <details key={selected} className={styles.example}>
            <summary>
              <span>See an example answer</span>
              <ArrowUpRight size={17} />
            </summary>
            <div className={styles.searchAnswer}>
              <h4>{search.title}</h4>
              <p>{search.answer}</p>
              <dl>
                <div>
                  <dt>Where they go next</dt>
                  <dd>{search.action}</dd>
                </div>
                <div>
                  <dt>What we track</dt>
                  <dd>{search.measure}</dd>
                </div>
              </dl>
            </div>
          </details>
          <p className={styles.caption}>
            Prepared search examples. Rankings and lead volume aren&apos;t
            guaranteed.
          </p>
        </div>
      </div>
    </div>
  );
}

export function PresentationTools() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<"notes" | "sources">("sources");
  function open(next: "notes" | "sources") {
    setPanel(next);
    dialog.current?.showModal();
  }
  return (
    <>
      <div className={styles.footerTools}>
        <button type="button" onClick={() => open("sources")}>
          Sources <ArrowUpRight size={13} />
        </button>
        <button type="button" onClick={() => open("notes")}>
          Presenter notes <ArrowUpRight size={13} />
        </button>
      </div>
      <dialog
        ref={dialog}
        className={`${frontier.dialog} ${styles.notesDialog}`}
        aria-labelledby="skorman-notes-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className={frontier.panel}>
          <div className={frontier.panelTop}>
            <h2 id="skorman-notes-title">
              {panel === "notes"
                ? "A guide for Sebastian"
                : "Sources & context"}
            </h2>
            <button
              type="button"
              className={frontier.close}
              aria-label="Close presentation notes"
              onClick={() => dialog.current?.close()}
            >
              <X size={22} strokeWidth={1.4} />
            </button>
          </div>
          {panel === "notes" ? (
            <>
              <p className={styles.notesIntro}>
                About 8–10 minutes. Use your own words, and open the examples
                when they help the conversation.
              </p>
              {talkingPoints.map((point) => (
                <details key={point.title} className={styles.example}>
                  <summary>
                    {point.title}
                    <ArrowUpRight size={16} />
                  </summary>
                  <div className={styles.talkingPoint}>
                    <p>{point.say}</p>
                    <span>What to show</span>
                    <p>{point.show}</p>
                  </div>
                </details>
              ))}
            </>
          ) : (
            <>
              <p className={styles.notesIntro}>
                Prepared for Skorman Development. Property facts were checked
                October 1, 2026 and may change. Renderings show proposed
                designs, not completed inventory.
              </p>
              <p className={styles.notesIntro}>
                The sites, project records, and search answers
                are examples. No live feeds or Skorman documents are connected.
                Property images come from Skorman&apos;s public website;
                engineering imagery comes from Pontian&apos;s existing site.
              </p>
              <div className={styles.sources}>
                {sources.map((source) => (
                  <a
                    key={source.href}
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div>
                      <h3>{source.label}</h3>
                      <p>{source.detail}</p>
                    </div>
                    <ArrowUpRight size={16} />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
