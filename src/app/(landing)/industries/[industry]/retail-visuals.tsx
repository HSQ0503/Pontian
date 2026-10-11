"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import styles from "./retail.module.css";
import type { ShelfSceneProps } from "./retail-scene";
import {
  BRIEFING_DATE, DAYS_OF_COVER, HARBOR_HOUSE_BLEND, LOCATIONS, MARKET_SPARE, PRODUCTS, RECEIPTS, REORDER, STORE_TOTAL, TASTING_SLOT, TRANSFER,
  forecastOf, location, shelfCounts, type ProductId, type StockOption,
} from "./retail-data";
import {
  BRIEFING_ANCHORS, BRIEFING_SIDES, BriefingElevation, COLORS, INCOMING_CARTON, REORDER_CARTON, STOCK_ANCHOR_Y, STOCK_BAY_X, StockElevation,
  type BriefingFocus, type ShelfLabel,
} from "./retail-shelf";

const ShelfScene = dynamic(() => import("./retail-scene"), { ssr: false });

const money = (value: number) => `$${value.toLocaleString("en-US")}`;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const roundedPercent = (value: number) => `${Math.round(value * 100)}%`;

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(callback: () => void) {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, () => window.matchMedia(MOTION_QUERY).matches, () => false);
}

let webglSupport: boolean | undefined;
function detectWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noSubscription = () => () => undefined;

// Fetches the 3D scene once the example nears the viewport, and renders it only while on screen.
function useShelfPresence(ref: RefObject<HTMLDivElement | null>) {
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const webgl = useSyncExternalStore(noSubscription, detectWebGL, () => false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const nearObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: "600px 0px" });
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "0px" });
    nearObserver.observe(element);
    visibleObserver.observe(element);
    return () => { nearObserver.disconnect(); visibleObserver.disconnect(); };
  }, [ref]);
  const live = near && webgl;
  const onReady = useCallback(() => setReady(true), []);
  return { near, visible, webgl, reducedMotion, live, ready: live && ready, onReady };
}
type ShelfPresence = ReturnType<typeof useShelfPresence>;

type SceneInput = ShelfSceneProps extends infer P ? (P extends unknown ? Omit<P, "active" | "reducedMotion" | "onReady"> : never) : never;

function ShelfView({ frame, presence, scene, fallback, className = "" }: { frame: RefObject<HTMLDivElement | null>; presence: ShelfPresence; scene: SceneInput; fallback: ReactNode; className?: string }) {
  return (
    <div ref={frame} className={`${styles.viewport} ${className}`} data-live={presence.ready || undefined}>
      <div className={styles.fallbackLayer} aria-hidden={presence.ready || undefined}>
        {fallback}
        {!presence.webgl && presence.near && <p className={styles.planNote}>Front view. The 3D shelf needs WebGL.</p>}
      </div>
      {presence.live && <ShelfScene {...(scene as ShelfSceneProps)} active={presence.visible} reducedMotion={presence.reducedMotion} onReady={presence.onReady} />}
      {presence.ready && <span className={styles.sceneHint} aria-hidden="true">Drag to turn</span>}
    </div>
  );
}

function Replay({ onClick, label = "Replay" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className={styles.replay} onClick={onClick}>
      <RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" /> {label}
    </button>
  );
}

type ExampleProps = { title: string; action?: ReactNode; children: ReactNode; situation: ReactNode; finding: ReactNode; next: ReactNode; findingLabel?: string };

function Example({ title, action, children, situation, finding, next, findingLabel = "Finding for review" }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.exampleNote}>Illustrative coffee retailer, not a Pontian client</span>
        {action}
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="situation"><span className={styles.outcomeLabel}>Situation</span>{situation}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>{findingLabel}</span>{finding}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
    </figure>
  );
}

/* Product glyphs match the 3D packaging: kraft House Blend, charcoal Reserve Blend, a ceramic brewer, a tasting flight. */
function Glyph({ product, size = 24 }: { product: ProductId; size?: number }) {
  const ink = "#262829";
  return (
    <svg className={styles.glyph} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      {(product === "house" || product === "reserve") && (
        <>
          <path d="M7.5 2.75h9l1.75 4.5V20.5a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V7.25z" fill={product === "house" ? COLORS.kraft : COLORS.charcoal} />
          <path d="M5.75 7.25h12.5" />
          <rect x="7.5" y="11" width="9" height="5" fill={product === "house" ? COLORS.kraftLabel : COLORS.charcoalLabel} strokeWidth="1" />
        </>
      )}
      {product === "brewer" && (
        <>
          <path d="M4.25 6.25h13.5l-3.75 8h-6z" fill={COLORS.ceramic} />
          <path d="M17.6 7.75h.9a2 2 0 0 1 0 4h-1.6" />
          <path d="M6.5 17.25h9" />
          <path d="M8 14.25v3M14 14.25v3" />
          <path d="M5.5 20.25h11" />
        </>
      )}
      {product === "tasting" && (
        <>
          {[3, 9.5, 16].map((x) => <path key={x} d={`M${x} 10.25h5v4.5a2.5 2.5 0 0 1-5 0z`} fill="#fff" />)}
          <path d="M2 20.25h20" />
        </>
      )}
    </svg>
  );
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T | null; onChange: (value: T) => void }) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>
      ))}
    </div>
  );
}

/* 1. Know the customer */

type Evidence = { lines: `${string}:${ProductId}`[]; preference: boolean };
const HOUSE_LINES = RECEIPTS.filter((receipt) => receipt.items.includes("house")).map((receipt) => `${receipt.id}:house` as const);
const houseCount = HOUSE_LINES.length;
const COUNT_WORDS = ["no", "once", "twice", "three times", "four times"];

const SUGGESTIONS: { id: Exclude<BriefingFocus, "owned">; product: ProductId; kind: string; reason: string; why: string; stock: string; starter: string; caution?: string; evidence: Evidence }[] = [
  {
    id: "house",
    product: "house",
    kind: "Familiar choice",
    reason: `On all ${houseCount} receipts`,
    why: "House Blend is on every receipt, about a month apart. Bought often. That doesn’t make it her favorite.",
    stock: `${HARBOR_HOUSE_BLEND} bags at Harbor Street, 08:00 count.`,
    starter: "Would you like your usual House Blend today?",
    evidence: { lines: HOUSE_LINES, preference: false },
  },
  {
    id: "reserve",
    product: "reserve",
    kind: "Something new",
    reason: "Chocolate notes, like her usual",
    why: "She told staff she likes chocolatey coffee. Both blends list chocolate notes in the catalog.",
    stock: `${location("harbor").stock} bags at Harbor Street, 08:00 count.`,
    starter: "You’ve been enjoying House Blend. Would you like to try another coffee with a similar chocolate profile?",
    caution: `It costs ${money(PRODUCTS.reserve.price - PRODUCTS.house.price)} more, so offer it next to her usual.`,
    evidence: { lines: HOUSE_LINES, preference: true },
  },
  {
    id: "tasting",
    product: "tasting",
    kind: "Next experience",
    reason: "Only if she wants to explore",
    why: "She’s only bought one coffee so far. A tasting is worth a mention if she wants to try others.",
    stock: `${TASTING_SLOT.when}, ${TASTING_SLOT.open} of ${TASTING_SLOT.places} places open.`,
    starter: "We also have a tasting session if you’d like to explore a few different coffees.",
    evidence: { lines: HOUSE_LINES, preference: true },
  },
];
const OWNED: Evidence = { lines: ["r1:brewer"], preference: false };

function briefingLabels(focus: BriefingFocus): ShelfLabel[] {
  return [
    ...SUGGESTIONS.map((item): ShelfLabel => ({
      id: item.id,
      at: BRIEFING_ANCHORS[item.product],
      side: BRIEFING_SIDES[item.product],
      title: PRODUCTS[item.product].short,
      detail: item.reason,
      state: focus === item.id ? "selected" : "ok",
    })),
    { id: "owned", at: BRIEFING_ANCHORS.brewer, side: BRIEFING_SIDES.brewer, title: "Brewer", detail: "Not suggested — already purchased", state: "blocked" },
  ];
}

export function KnowTheCustomer() {
  const [focus, setFocus] = useState<BriefingFocus>("house");
  const frame = useRef<HTMLDivElement>(null);
  const presence = useShelfPresence(frame);
  const selected = SUGGESTIONS.find((item) => item.id === focus);
  const evidence = selected ? selected.evidence : OWNED;
  const labels = briefingLabels(focus);

  return (
    <Example
      title="Maya at the counter, Harbor Street"
      situation={<p>Maya comes in. Staff find her loyalty account by name.</p>}
      finding={<p><strong>A short briefing.</strong> Each suggestion shows why it’s there.</p>}
      next={<p>Your salesperson decides what, if anything, to mention. Nothing goes in a basket.</p>}
      findingLabel="Result for review"
    >
      <div className={styles.customerGrid}>
        <ShelfView
          frame={frame}
          presence={presence}
          className={styles.briefingView}
          scene={{ kind: "briefing", focus, onPick: setFocus, labels, label: "The Harbor Street coffee shelf. The suggested product is highlighted. Drag or use the arrow keys to turn the view." }}
          fallback={<BriefingElevation focus={focus} labels={labels} onPick={setFocus} />}
        />

        <div className={styles.briefing}>
          <p className={styles.briefingHead}><strong>Briefing: Maya</strong><span>Loyalty member since 8 March. Found by name, no cameras.</span></p>
          <dl className={styles.facts}>
            <div>
              <dt>Observed</dt>
              <dd>
                Purchased House Blend {COUNT_WORDS[houseCount]}.
                <ol className={styles.receipts} aria-label={`Receipts on record as of ${BRIEFING_DATE}`}>
                  {RECEIPTS.map((receipt) => (
                    <li key={receipt.id}>
                      <span className={styles.receiptDate}>{receipt.short}</span>
                      {receipt.items.map((item) => (
                        <span key={item} className={styles.receiptLine} data-highlight={evidence.lines.includes(`${receipt.id}:${item}`)}>
                          <Glyph product={item} size={18} />{item === "brewer" ? "Brewer" : "House Blend"}
                        </span>
                      ))}
                    </li>
                  ))}
                </ol>
              </dd>
            </div>
            <div>
              <dt>Observed</dt>
              <dd><button type="button" className={styles.textButton} aria-pressed={focus === "owned"} onClick={() => setFocus("owned")}>Already owns this brewer.</button></dd>
            </div>
            <div data-recorded="true">
              <dt>Recorded</dt>
              <dd className={styles.preference} data-highlight={evidence.preference}>Recorded preference: chocolatey coffee. <span>Told to staff, 8 March</span></dd>
            </div>
          </dl>

          <Segmented label="Suggestion" options={SUGGESTIONS.map((item) => ({ id: item.id, label: item.kind }))} value={focus === "owned" ? null : focus} onChange={setFocus} />
          <div className={styles.conversation} aria-live="polite">
            {selected ? (
              <>
                <p className={styles.starter}>“{selected.starter}”</p>
                <p className={styles.why}>{selected.why}</p>
                <p className={styles.meta}>In stock: {selected.stock}{selected.caution && <> {selected.caution}</>}</p>
              </>
            ) : (
              <>
                <p className={styles.starter}>Not suggested. Maya already owns this brewer.</p>
                <p className={styles.meta}>Receipt, 8 March: {PRODUCTS.brewer.name}, {money(PRODUCTS.brewer.price)}.</p>
              </>
            )}
          </div>
          <button type="button" className={styles.excluded} aria-pressed={focus === "owned"} onClick={() => setFocus("owned")}>
            <Glyph product="brewer" size={20} />Brewer not suggested — already purchased.
          </button>
        </div>
      </div>
    </Example>
  );
}

/* 2. Understand the business */

type CategoryId = "beans" | "equipment" | "tastings";
type StoreId = "harbor" | "market";
type Month = "april" | "may";
type StoreMonth = { categories: Record<CategoryId, { sales: number; cost: number }>; discounts: number; returns: number };

const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: "beans", name: "Coffee beans" },
  { id: "equipment", name: "Brewing equipment" },
  { id: "tastings", name: "Tasting sessions" },
];
const STORE_NAMES: Record<StoreId, string> = { harbor: "Harbor Street", market: "Market Square" };
const STORE_IDS: StoreId[] = ["harbor", "market"];

// Net sales are after discounts and returns. Cost is the recorded product cost of what was sold.
const LEDGER: Record<Month, Record<StoreId, StoreMonth>> = {
  april: {
    harbor: { categories: { beans: { sales: 20400, cost: 8160 }, equipment: { sales: 5600, cost: 3920 }, tastings: { sales: 2700, cost: 810 } }, discounts: 830, returns: 290 },
    market: { categories: { beans: { sales: 13800, cost: 5520 }, equipment: { sales: 12900, cost: 9030 }, tastings: { sales: 1500, cost: 450 } }, discounts: 820, returns: 280 },
  },
  may: {
    harbor: { categories: { beans: { sales: 21000, cost: 8400 }, equipment: { sales: 6000, cost: 4200 }, tastings: { sales: 3000, cost: 900 } }, discounts: 900, returns: 300 },
    market: { categories: { beans: { sales: 13500, cost: 5400 }, equipment: { sales: 14500, cost: 10150 }, tastings: { sales: 1800, cost: 540 } }, discounts: 890, returns: 310 },
  },
};

type PeriodId = "april" | "may" | "both";
const PERIOD_OPTIONS: { id: PeriodId; label: string }[] = [
  { id: "april", label: "April" },
  { id: "may", label: "May" },
  { id: "both", label: "April and May" },
];

function summarize(store: StoreId, period: PeriodId) {
  const months: Month[] = period === "both" ? ["april", "may"] : [period];
  const categories = CATEGORIES.map((category) => {
    const sales = months.reduce((total, month) => total + LEDGER[month][store].categories[category.id].sales, 0);
    const cost = months.reduce((total, month) => total + LEDGER[month][store].categories[category.id].cost, 0);
    return { ...category, sales, cost, margin: (sales - cost) / sales };
  });
  const sales = categories.reduce((total, category) => total + category.sales, 0);
  const cost = categories.reduce((total, category) => total + category.cost, 0);
  const discounts = months.reduce((total, month) => total + LEDGER[month][store].discounts, 0);
  const returns = months.reduce((total, month) => total + LEDGER[month][store].returns, 0);
  const beforeDiscounts = sales + discounts + returns;
  return {
    categories: categories.map((category) => ({ ...category, share: category.sales / sales })),
    sales,
    cost,
    grossProfit: sales - cost,
    margin: (sales - cost) / sales,
    discountRate: discounts / beforeDiscounts,
    returnRate: returns / beforeDiscounts,
  };
}

export function UnderstandTheBusiness() {
  const [period, setPeriod] = useState<PeriodId>("may");
  const [store, setStore] = useState<StoreId>("market");
  const [open, setOpen] = useState(false);
  const stores = { harbor: summarize("harbor", period), market: summarize("market", period) };
  const shown = stores[store];
  const periodLabel = PERIOD_OPTIONS.find((item) => item.id === period)?.label ?? "";
  const lowestMargin = [...shown.categories].sort((a, b) => a.margin - b.margin)[0];
  const marginsMatch = CATEGORIES.every((_, index) => Math.abs(stores.harbor.categories[index].margin - stores.market.categories[index].margin) < 0.005);
  const equipment = { harbor: stores.harbor.categories[1].share, market: stores.market.categories[1].share };
  const similar = (a: number, b: number) => Math.abs(a - b) < 0.005;

  const checks = [
    { name: "Products sold", result: `Equipment: ${roundedPercent(equipment.market)} vs ${roundedPercent(equipment.harbor)}`, status: "Differs" },
    { name: "Product costs", result: "One cost list for both", status: marginsMatch ? "Same" : "Differs" },
    { name: "Discounts", result: `${percent(stores.market.discountRate)} vs ${percent(stores.harbor.discountRate)}`, status: similar(stores.market.discountRate, stores.harbor.discountRate) ? "Similar" : "Differs" },
    { name: "Returns", result: `${percent(stores.market.returnRate)} vs ${percent(stores.harbor.returnRate)}`, status: similar(stores.market.returnRate, stores.harbor.returnRate) ? "Similar" : "Differs" },
  ];

  return (
    <Example
      title="Two stores, similar sales"
      situation={<p>Net sales for {periodLabel}: <strong>{money(stores.harbor.sales)}</strong> at Harbor Street and <strong>{money(stores.market.sales)}</strong> at Market Square.</p>}
      finding={
        <button type="button" className={styles.findingButton} aria-expanded={open} aria-controls="retail-records" onClick={() => setOpen(!open)}>
          <strong>More of Market Square’s sales came from lower-margin products.</strong>
          <span>The records show what sold. They don’t show why.</span>
          <span className={styles.findingAction}>{open ? "Hide the records" : "Show the records"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
        </button>
      }
      next={<p>Go through product mix and displays with the store manager. <span className={styles.muted}>Next question: why does equipment sell better there?</span></p>}
    >
      <div className={styles.questionRow}>
        <div>
          <p className={styles.label}>The owner asks</p>
          <p className={styles.ownerQuestion}>“Why is product gross margin lower at Market Square?”</p>
        </div>
        <Segmented label="Period" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      </div>

      <div className={styles.mixPanel}>
        <div className={styles.mixRows} role="group" aria-label="Share of net sales by category. Choose a store to see its records.">
          {STORE_IDS.map((id) => (
            <button key={id} type="button" className={styles.mixRow} aria-pressed={open && store === id} onClick={() => { setStore(id); setOpen(true); }}>
              <span className={styles.mixName}>{STORE_NAMES[id]}<small>{money(stores[id].sales)} net sales</small></span>
              <span className={styles.mixBar}>
                {stores[id].categories.map((category) => (
                  <span key={category.id} data-category={category.id} style={{ flexBasis: `${category.share * 100}%` }}>{roundedPercent(category.share)}</span>
                ))}
              </span>
              <span className={styles.mixMargin}><strong>{percent(stores[id].margin)}</strong>margin</span>
            </button>
          ))}
        </div>
        <ul className={styles.legend}>
          {stores.market.categories.map((category) => <li key={category.id}><span data-category={category.id} aria-hidden="true" />{category.name}, {roundedPercent(category.margin)} margin</li>)}
        </ul>
      </div>

      <ul className={styles.checks} aria-label="What was checked">
        {checks.map((check) => (
          <li key={check.name} data-status={check.status}>
            <span className={styles.checkName}>{check.name}<span className={styles.checkStatus}>{check.status}</span></span>
            <span className={styles.checkResult}>{check.result}</span>
          </li>
        ))}
      </ul>

      {open && (
        <div id="retail-records" className={styles.records} aria-live="polite">
          <p className={styles.panelTitle}>Records: {STORE_NAMES[store]}, {periodLabel}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Category</th><th>Net sales</th><th>Share</th><th>Product cost</th><th>Margin</th></tr></thead>
              <tbody>
                {shown.categories.map((category) => (
                  <tr key={category.id} data-highlight={category.id === lowestMargin.id}>
                    <td>{category.name}</td><td>{money(category.sales)}</td><td>{roundedPercent(category.share)}</td><td>{money(category.cost)}</td><td>{roundedPercent(category.margin)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td><td>{money(shown.sales)}</td><td>100%</td><td>{money(shown.cost)}</td><td>{percent(shown.margin)}</td></tr></tfoot>
            </table>
          </div>
          <p className={styles.meta}>Product gross margin is net sales minus recorded product cost: {money(shown.grossProfit)} here. Rent and wages aren’t in it, so it isn’t store profit.</p>
        </div>
      )}
    </Example>
  );
}

/* 3. Plan the next visit */

const CHECK_DATE = "16 June";
// Day 0 is 8 March, the first receipt. 16 June is day 100, so days map directly to percent.
const HOUSE_DAYS = [
  { date: "8 Mar", day: 0 },
  { date: "6 Apr", day: 29 },
  { date: "5 May", day: 58 },
];
const NEWER_PURCHASE = { date: "12 June", short: "12 Jun", store: "Riverside", day: 96 };

function useSequence(length: number) {
  const [step, setStep] = useState(length - 1);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!playing || step >= length - 1) return;
    const timer = window.setTimeout(() => setStep(step + 1), 900);
    return () => window.clearTimeout(timer);
  }, [playing, step, length]);
  const replay = () => {
    if (reducedMotion) return;
    setStep(0);
    setPlaying(true);
  };
  return { step, replay };
}

function Stage({ index, step, className = "", children }: { index: number; step: number; className?: string; children: ReactNode }) {
  return <div className={`${styles.stage} ${className}`} data-pending={index > step}>{children}</div>;
}

export function PlanTheNextVisit() {
  const [newer, setNewer] = useState<"none" | "found">("none");
  const { step, replay } = useSequence(3);
  const found = newer === "found";
  const last = HOUSE_DAYS[2].day;
  const usual = HOUSE_DAYS[1].day - HOUSE_DAYS[0].day;
  const gap = 100 - last;
  const sinceLast = NEWER_PURCHASE.day - last;

  const checks = [
    { question: "Newer purchase", result: found ? `${NEWER_PURCHASE.date}, ${NEWER_PURCHASE.store}` : "None at any store since 5 May", state: found ? "stop" : "clear" },
    { question: "Open order", result: found ? "Not checked" : "None", state: found ? "skipped" : "clear" },
    { question: "Recent message", result: found ? "Not checked" : "None in 60 days", state: found ? "skipped" : "clear" },
    { question: "Contact preference", result: found ? "Not checked" : "Email, opted in 8 March", state: found ? "skipped" : "clear" },
  ];

  return (
    <Example
      title={`Maya’s record, checked ${CHECK_DATE}`}
      action={<Replay onClick={replay} />}
      situation={found ? <p>A newer purchase shows up in Maya’s record.</p> : <p>Six weeks since Maya’s last recorded purchase.</p>}
      finding={found ? <p><strong>Recent purchase found — no reminder needed.</strong> Nobody contacts her.</p> : <p><strong>May be ready for a refill.</strong> A draft waits for review. Nothing has been sent.</p>}
      next={found ? <p>No action. Her record gets checked again after her usual interval.</p> : <p>Someone on your team edits, approves or bins the draft.</p>}
    >
      <div className={styles.recordToggle}>
        <Segmented label="Purchase record" options={[{ id: "none", label: "No newer purchase" }, { id: "found", label: "New purchase recorded" }]} value={newer} onChange={setNewer} />
      </div>

      <div className={styles.panel}>
        <p className={styles.panelTitle}><Glyph product="house" size={22} />Maya’s House Blend purchases</p>
        <div className={styles.timeline} role="img" aria-label={`House Blend bought on 8 March, 6 April and 5 May, ${usual} days apart. ${found ? "A newer purchase on 12 June at Riverside." : `No purchase in the ${gap} days since, as of 16 June.`}`}>
          <span className={styles.track} />
          <Stage index={0} step={step} className={styles.timelineLayer}>
            {HOUSE_DAYS.slice(1).map((point, index) => (
              <span key={point.date} className={styles.interval} style={{ left: `${HOUSE_DAYS[index].day}%`, width: `${point.day - HOUSE_DAYS[index].day}%` }}>{point.day - HOUSE_DAYS[index].day} days</span>
            ))}
            {HOUSE_DAYS.map((point) => <span key={point.date} className={styles.dot} style={{ left: `${point.day}%` }}><span>{point.date}</span></span>)}
          </Stage>
          <Stage index={1} step={step} className={styles.timelineLayer}>
            <span className={styles.gap} data-found={found} style={{ left: `${last}%`, width: `${(found ? NEWER_PURCHASE.day : 100) - last}%` }}>
              {found ? `${sinceLast} days` : `${gap} days, no purchase`}
            </span>
            {found && <span className={`${styles.dot} ${styles.dotNew}`} style={{ left: `${NEWER_PURCHASE.day}%` }}><span>{NEWER_PURCHASE.short}</span></span>}
            <span className={styles.today} style={{ left: "100%" }}><span>Checked {CHECK_DATE}</span></span>
          </Stage>
        </div>
        <Stage index={1} step={step} className={styles.pattern}>
          <p className={styles.patternText}>{found ? "She bought House Blend at Riverside on 12 June." : `She usually comes back after ${usual} days. It’s been ${gap}.`}</p>
          {!found && <p className={styles.meta}>Three purchases is a short pattern. We don’t know how much coffee she has left, or whether she bought some elsewhere.</p>}
        </Stage>
      </div>

      <Stage index={2} step={step} className={styles.followGrid}>
        <div className={styles.panel}>
          <p className={styles.label}>Checked before drafting</p>
          <ul className={styles.followChecks}>
            {checks.map((check) => (
              <li key={check.question} data-state={check.state}>
                <span className={styles.checkIcon} aria-hidden="true">{check.state === "clear" ? <Check size={14} strokeWidth={2} /> : check.state === "stop" ? "!" : "–"}</span>
                <span><strong>{check.question}</strong>{check.result}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.panel}>
          {found ? (
            <div className={styles.draft}>
              <p className={styles.label}>Outcome</p>
              <p className={styles.patternText}>Recent purchase found — no reminder needed.</p>
              <p className={styles.meta}>No draft was prepared.</p>
            </div>
          ) : (
            <div className={styles.draft}>
              <p className={styles.draftLabel}>Draft follow-up — awaiting review</p>
              <p className={styles.draftText}>Hi Maya, would you like help choosing your next coffee? Your usual House Blend is available.</p>
              <p className={styles.meta}>By email, her opted-in channel. House Blend: 12 bags at Harbor Street, 08:00 count on {CHECK_DATE}. Nothing is sent from this page.</p>
            </div>
          )}
        </div>
      </Stage>
    </Example>
  );
}

/* 4. Stock for demand */

const harbor = location("harbor");
const market = location("market");
const riverside = location("riverside");
const harborForecast = forecastOf(harbor);

function stockLabels(option: StockOption, counts: ReturnType<typeof shelfCounts>): ShelfLabel[] {
  const filled = counts.harbor >= harborForecast.expected;
  const top = (id: "harbor" | "market" | "riverside") => [STOCK_BAY_X[id], STOCK_ANCHOR_Y, 0.2] as [number, number, number];
  const labels: ShelfLabel[] = [
    {
      id: "harbor",
      at: top("harbor"),
      side: "top",
      title: harbor.name,
      detail: `${counts.harbor} bags`,
      note: option === "reorder" ? `out in about ${DAYS_OF_COVER} days` : filled ? "if approved" : `needs about ${harborForecast.expected}`,
      state: option === "transfer" && filled ? "ok" : "blocked",
    },
    { id: "market", at: top("market"), side: "top", title: market.name, detail: `${counts.market} bags`, note: counts.market < market.stock ? `keeps its ${market.reserve} reserve` : `${MARKET_SPARE} above reserve` },
    { id: "riverside", at: top("riverside"), side: "top", title: riverside.name, detail: `${counts.riverside} bags`, note: "covers its forecast" },
    { id: "incoming", at: [INCOMING_CARTON.at[0] + INCOMING_CARTON.size[0] / 2, INCOMING_CARTON.size[1], INCOMING_CARTON.at[2]], side: "right", title: `${riverside.incoming} due in ${riverside.incomingDays} days`, detail: "Stays at Riverside", lead: 20 },
  ];
  if (option === "reorder") labels.push({ id: "reorder", at: [REORDER_CARTON.at[0] - REORDER_CARTON.size[0] / 2, REORDER_CARTON.size[1], REORDER_CARTON.at[2]], side: "left", title: `${REORDER.quantity} from the roaster`, detail: `Arrives in ${REORDER.leadDays} days`, state: "ok", lead: 20 });
  return labels;
}

export function StockForDemand() {
  const [option, setOption] = useState<StockOption>("transfer");
  const [armed, setArmed] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [progress, setProgress] = useState({ lifted: 0, landed: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const presence = useShelfPresence(frame);
  const animate = presence.ready && !presence.reducedMotion;

  // The transfer plays once, the first time the shelves come into view.
  useEffect(() => {
    if (!animate || !presence.visible || armed) return;
    const timer = window.setTimeout(() => setArmed(true), 500);
    return () => window.clearTimeout(timer);
  }, [animate, presence.visible, armed]);

  const onProgress = useCallback((lifted: number, landed: number) => setProgress({ lifted, landed }), []);
  const settled = option === "transfer" ? TRANSFER : 0;
  const counts = presence.ready ? shelfCounts(progress.lifted, progress.landed) : shelfCounts(settled, settled);
  const total = counts.harbor + counts.market + counts.riverside + counts.transit;
  const moved = option === "transfer" && (armed || presence.reducedMotion);
  const labels = stockLabels(option, counts);

  const assumptions = [
    `Market Square counted ${market.stock} at 08:00`,
    "No orders due at either store",
    `Harbor Street needs about ${harborForecast.expected} (${harborForecast.low}–${harborForecast.high}), an estimate`,
    `Market Square keeps ${market.stock - TRANSFER}, above its ${market.reserve} reserve`,
  ];

  return (
    <Example
      title="Reserve Blend across three stores, 3 June"
      action={animate && option === "transfer" ? <Replay label="Replay the move" onClick={() => { setArmed(true); setReplayCount((count) => count + 1); }} /> : undefined}
      situation={<p>Harbor Street has {harbor.stock} bags and needs about {harborForecast.expected}. Market Square has {market.stock} and needs about {forecastOf(market).expected}.</p>}
      finding={<p><strong>A transfer proposal:</strong> {TRANSFER} bags from Market Square to Harbor Street. Nothing has been moved or ordered.</p>}
      next={<p>The manager checks quantities and timing, then approves or changes it.</p>}
      findingLabel="Result for review"
    >
      <div className={styles.stockHead}>
        <div>
          <p className={styles.label}><Glyph product="reserve" size={20} />Reserve Blend, 250 g bags</p>
          <p className={styles.ownerQuestion}>Transfer stock or place another order?</p>
        </div>
        <Segmented label="Option" options={[{ id: "transfer", label: `Transfer ${TRANSFER} bags` }, { id: "reorder", label: `Order ${REORDER.quantity} instead` }]} value={option} onChange={setOption} />
      </div>

      <ShelfView
        frame={frame}
        presence={presence}
        className={styles.stockView}
        scene={{ kind: "stock", moved, replay: replayCount, reorder: option === "reorder", onProgress, labels, label: `Reserve Blend shelves at ${LOCATIONS.map((item) => item.name).join(", ")}. Drag or use the arrow keys to turn the view.` }}
        fallback={<StockElevation option={option} labels={labels} />}
      />

      <p className={styles.caption} data-tone={option === "transfer" ? "ok" : "alert"} aria-live="polite">
        {option === "transfer"
          ? `Market Square has ${MARKET_SPARE} bags above its ${market.reserve}-bag reserve. ${TRANSFER} of them fill Harbor Street’s gap on the next-day store run.`
          : `The roaster’s minimum is ${REORDER.quantity} bags, ${REORDER.leadDays} days away. Harbor Street’s ${harbor.stock} bags last about ${DAYS_OF_COVER}.`}
      </p>

      <p className={styles.ledger} aria-live="polite">
        <span>{harbor.name} <strong>{counts.harbor}</strong></span>
        <span>+ {market.name} <strong>{counts.market}</strong></span>
        <span>+ {riverside.name} <strong>{counts.riverside}</strong></span>
        {counts.transit > 0 && <span>+ moving <strong>{counts.transit}</strong></span>}
        <span className={styles.ledgerTotal}>= <strong>{total}</strong> bags{option === "transfer" ? `, the same ${STORE_TOTAL} as this morning` : ` in stores. The order adds ${REORDER.quantity} new bags from the roaster`}</span>
      </p>

      {option === "transfer" && (
        <ul className={styles.assumptions} aria-label="Checked before proposing the transfer">
          {assumptions.map((item) => <li key={item}><Check size={15} strokeWidth={2} aria-hidden="true" />{item}</li>)}
        </ul>
      )}
    </Example>
  );
}
