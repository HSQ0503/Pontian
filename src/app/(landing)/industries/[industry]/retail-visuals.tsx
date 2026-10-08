"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowRight, Check, RotateCcw, Search } from "lucide-react";
import styles from "./retail.module.css";

/*
 * One fictional specialty coffee retailer runs through every example:
 * three stores, one loyalty customer (Maya), and four catalog items.
 * Displayed totals, shares, and margins are computed from these records.
 */

type ProductId = "house" | "reserve" | "brewer" | "tasting";

const PRODUCTS: Record<ProductId, { name: string; price: number; catalog: string }> = {
  house: { name: "House Blend, 250 g", price: 16, catalog: "Medium roast. Tasting notes: milk chocolate, toasted almond." },
  reserve: { name: "Reserve Blend, 250 g", price: 24, catalog: "Medium-dark roast. Tasting notes: dark chocolate, cherry, brown sugar." },
  brewer: { name: "Ceramic pour-over brewer", price: 38, catalog: "Pour-over brewer for one or two cups." },
  tasting: { name: "Coffee tasting session", price: 15, catalog: "45 minutes. Five coffees, including House Blend and Reserve Blend." },
};

type Receipt = { id: string; date: string; daysAgo: number; store: string; items: ProductId[] };

const BRIEFING_DATE = "3 June";
const RECEIPTS: Receipt[] = [
  { id: "r1", date: "8 March", daysAgo: 87, store: "Harbor Street", items: ["brewer", "house"] },
  { id: "r2", date: "6 April", daysAgo: 58, store: "Harbor Street", items: ["house"] },
  { id: "r3", date: "5 May", daysAgo: 29, store: "Harbor Street", items: ["house"] },
];
const PREFERENCE = { text: "Enjoys chocolatey coffee", source: "Told to staff by Maya and recorded on 8 March" };

const money = (value: number) => `$${value.toLocaleString("en-US")}`;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five"];
const times = (count: number) => (count === 1 ? "once" : `${COUNT_WORDS[count] ?? count} times`);

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(callback: () => void) {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, () => window.matchMedia(MOTION_QUERY).matches, () => false);
}

function useSequence(length: number) {
  const [step, setStep] = useState(length - 1);
  const [auto, setAuto] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!auto || step >= length - 1) return;
    const timer = window.setTimeout(() => setStep(step + 1), 1100);
    return () => window.clearTimeout(timer);
  }, [auto, step, length]);
  return {
    step,
    goTo: (next: number) => { setAuto(false); setStep(next); },
    replay: () => { setStep(0); setAuto(!reducedMotion); },
  };
}

function Sequence({ stages, step, goTo, replay }: { stages: string[]; step: number; goTo: (step: number) => void; replay: () => void }) {
  return (
    <div className={styles.sequence} role="group" aria-label="Step through the example">
      <ol className={styles.sequenceSteps}>
        {stages.map((stage, index) => (
          <li key={stage}>
            <button type="button" aria-current={index === step ? "step" : undefined} data-reached={index <= step} onClick={() => goTo(index)}>
              <span>{String(index + 1).padStart(2, "0")}</span>{stage}
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className={styles.replay} onClick={replay}><RotateCcw size={13} strokeWidth={1.6} aria-hidden="true" /> Replay</button>
    </div>
  );
}

function Stage({ index, step, className = "", children }: { index: number; step: number; className?: string; children: ReactNode }) {
  return <div className={`${styles.stage} ${className}`} data-pending={index > step}>{children}</div>;
}

type ExampleProps = { title: string; children: ReactNode; situation: ReactNode; finding: ReactNode; next: ReactNode; findingLabel?: string };

function Example({ title, children, situation, finding, next, findingLabel = "Finding for review" }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.exampleNote}>Illustrative coffee retailer, not a Pontian client</span>
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

function Mark({ product }: { product: ProductId }) {
  return <span className={styles.mark} data-product={product} aria-hidden="true" />;
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>
      ))}
    </div>
  );
}

/* 1. Know the customer */

type Period = "3" | "6" | "12";
const PERIODS: { id: Period; label: string; days: number; since: string }[] = [
  { id: "3", label: "Last 3 months", days: 92, since: "3 March" },
  { id: "6", label: "Last 6 months", days: 183, since: "3 December" },
  { id: "12", label: "Last 12 months", days: 365, since: "3 June last year" },
];

type Focus = "familiar" | "new" | "experience" | "owned";
type Evidence = { lines: `${string}:${ProductId}`[]; preference: boolean };

const HOUSE_LINES = RECEIPTS.filter((receipt) => receipt.items.includes("house")).map((receipt) => `${receipt.id}:house` as const);

const RECOMMENDATIONS: {
  id: Exclude<Focus, "owned">;
  kind: string;
  title: string;
  product: ProductId;
  reason: string;
  why: string;
  availability: string;
  starter: string;
  caution?: string;
  evidence: Evidence;
}[] = [
  {
    id: "familiar",
    kind: "Familiar choice",
    title: "Offer their usual House Blend.",
    product: "house",
    reason: "Bought three times, about a month apart.",
    why: "House Blend appears on every receipt in her history. That makes it frequently purchased. She has not told us it is her favorite.",
    availability: "18 bags at Harbor Street. Store inventory count, 08:00 today.",
    starter: "Would you like your usual House Blend today?",
    evidence: { lines: HOUSE_LINES, preference: false },
  },
  {
    id: "new",
    kind: "Something new",
    title: "Introduce Reserve Blend, which shares the chocolate notes they enjoy.",
    product: "reserve",
    reason: "Matches her recorded preference for chocolatey coffee.",
    why: "Maya told staff she enjoys chocolatey coffee. The catalog lists chocolate notes for both House Blend and Reserve Blend.",
    availability: "6 bags at Harbor Street. Store inventory count, 08:00 today.",
    starter: "You've been enjoying House Blend. Would you like to try another coffee with a similar chocolate profile?",
    caution: "Costs $8 more than House Blend. Offer it as an option alongside her usual, not as a replacement.",
    evidence: { lines: HOUSE_LINES, preference: true },
  },
  {
    id: "experience",
    kind: "Next experience",
    title: "Mention the tasting session if they are interested in exploring more coffees.",
    product: "tasting",
    reason: "She has bought one coffee so far. Worth raising only if she wants to explore.",
    why: "Her receipts show one coffee, House Blend, and her recorded preference gives a starting point for a tasting.",
    availability: "Saturday 10:00, 3 of 8 places open. Booking calendar, 08:00 today.",
    starter: "We also have a tasting session if you'd like to explore a few different coffees.",
    evidence: { lines: HOUSE_LINES, preference: true },
  },
];

const OWNED: Evidence = { lines: ["r1:brewer"], preference: false };

export function KnowTheCustomer() {
  const [period, setPeriod] = useState<Period>("3");
  const [focus, setFocus] = useState<Focus>("familiar");
  const sequence = useSequence(4);
  const { step } = sequence;
  const window_ = PERIODS.find((item) => item.id === period) ?? PERIODS[0];
  const receipts = RECEIPTS.filter((receipt) => receipt.daysAgo <= window_.days);
  const houseCount = receipts.filter((receipt) => receipt.items.includes("house")).length;
  const ownsBrewer = receipts.some((receipt) => receipt.items.includes("brewer"));
  const itemCount = receipts.reduce((total, receipt) => total + receipt.items.length, 0);
  const firstReceipt = RECEIPTS[0];
  const olderThanRecords = window_.days > firstReceipt.daysAgo + 5;
  const selected = RECOMMENDATIONS.find((item) => item.id === focus);
  const evidence = selected ? selected.evidence : OWNED;

  return (
    <Example
      title="Maya at the counter, Harbor Street"
      situation={<p>Maya comes in. A staff member finds her loyalty account by name.</p>}
      finding={<p><strong>A short briefing:</strong> what she bought, what she told us, and three ways to help. Each suggestion shows its reason.</p>}
      next={<p>The salesperson decides what, if anything, to mention. Nothing is added to a basket.</p>}
      findingLabel="Result for review"
    >
      <Sequence stages={["Look up", "History", "Briefing", "Suggestions"]} {...sequence} />

      <Stage index={0} step={step} className={styles.lookup}>
        <p className={styles.sheetLabel}>Loyalty lookup</p>
        <div className={styles.lookupRow}>
          <span className={styles.lookupField}><Search size={15} strokeWidth={1.6} aria-hidden="true" /> Maya</span>
          <span className={styles.lookupResult}><strong>Maya</strong> Loyalty member since 8 March, usually shops at Harbor Street</span>
          <span className={styles.chip}>Selected by staff</span>
        </div>
        <p className={styles.sheetMeta}>Found by name or loyalty number at the counter. No cameras or automatic identification.</p>
      </Stage>

      <div className={styles.customerGrid}>
        <Stage index={1} step={step} className={styles.sheet}>
          <div className={styles.sheetHead}>
            <p className={styles.sheetTitle}>Maya&apos;s customer history</p>
            <Segmented label="History period" options={PERIODS} value={period} onChange={setPeriod} />
          </div>
          <p className={styles.periodLine} aria-live="polite">
            Since {window_.since}: {receipts.length} receipts, {itemCount} items. Records as of {BRIEFING_DATE}.
          </p>
          <ol className={styles.receipts}>
            {[...receipts].reverse().map((receipt) => (
              <li key={receipt.id} className={styles.receipt}>
                <p className={styles.receiptHead}><strong>{receipt.date}</strong><span>{receipt.store}</span></p>
                <ul>
                  {receipt.items.map((item) => (
                    <li key={item} data-highlight={evidence.lines.includes(`${receipt.id}:${item}`)}>
                      <Mark product={item} />
                      <span>{PRODUCTS[item].name}</span>
                      <span className={styles.price}>{money(PRODUCTS[item].price)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {olderThanRecords && (
            <p className={styles.empty}>No purchases recorded between {window_.since} and 7 March. Maya&apos;s first recorded purchase is on 8 March.</p>
          )}
          <div className={styles.preference} data-highlight={evidence.preference}>
            <p className={styles.sheetLabel}>Recorded preference</p>
            <p className={styles.preferenceText}>{PREFERENCE.text}</p>
            <p className={styles.sheetMeta}>{PREFERENCE.source}</p>
          </div>
        </Stage>

        <div className={styles.briefingColumn}>
          <Stage index={2} step={step} className={styles.sheet}>
            <p className={styles.sheetTitle}>Salesperson briefing</p>
            <div className={styles.briefGroup} data-kind="observed">
              <p className={styles.sheetLabel}>Observed purchases</p>
              <ul>
                <li>Purchased House Blend {times(houseCount)}.</li>
                {ownsBrewer && (
                  <li>
                    <button type="button" className={styles.inlineButton} aria-pressed={focus === "owned"} onClick={() => setFocus("owned")}>
                      Already owns this brewer. <span>Show receipt <ArrowRight size={12} strokeWidth={1.6} aria-hidden="true" /></span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
            <div className={styles.briefGroup} data-kind="recorded">
              <p className={styles.sheetLabel}>Recorded preference</p>
              <ul><li>Recorded preference: chocolatey coffee.</li></ul>
            </div>
            <p className={styles.sheetMeta}>Frequently purchased is not the same as a confirmed favorite.</p>
          </Stage>

          <Stage index={3} step={step} className={styles.sheet}>
            <div className={styles.briefGroup} data-kind="suggested">
              <p className={styles.sheetLabel}>Suggested next steps</p>
            </div>
            <div className={styles.recommendations}>
              {RECOMMENDATIONS.map((item) => (
                <button key={item.id} type="button" className={styles.recommendation} aria-pressed={focus === item.id} onClick={() => setFocus(item.id)}>
                  <span className={styles.recKind}><Mark product={item.product} />{item.kind}</span>
                  <span className={styles.recTitle}>{item.title}</span>
                  <span className={styles.recReason}>{item.reason}</span>
                </button>
              ))}
              <button type="button" className={styles.excluded} aria-pressed={focus === "owned"} onClick={() => setFocus("owned")}>
                <Mark product="brewer" />
                <span><strong>Brewer not suggested</strong> — already purchased.</span>
                <span className={styles.excludedAction}>Already owns</span>
              </button>
            </div>
            <div className={styles.recDetail} aria-live="polite">
              {selected ? (
                <dl>
                  <div><dt>Why it may be relevant</dt><dd>{selected.why}</dd></div>
                  <div><dt>From the catalog</dt><dd>{PRODUCTS[selected.product].name}, {money(PRODUCTS[selected.product].price)}. {PRODUCTS[selected.product].catalog}</dd></div>
                  <div><dt>Availability</dt><dd>{selected.availability}</dd></div>
                  {selected.caution && <div><dt>Keep in mind</dt><dd>{selected.caution}</dd></div>}
                  <div><dt>Conversation starter</dt><dd className={styles.starter}>&ldquo;{selected.starter}&rdquo;</dd></div>
                </dl>
              ) : (
                <dl>
                  <div><dt>Why it is left out</dt><dd>The 8 March receipt shows Maya bought the ceramic pour-over brewer. Suggesting it again would not help her.</dd></div>
                  <div><dt>Receipt</dt><dd>8 March, Harbor Street: {PRODUCTS.brewer.name}, {money(PRODUCTS.brewer.price)}.</dd></div>
                </dl>
              )}
              <p className={styles.sheetMeta}>Highlighted in her history: the {selected ? (selected.evidence.preference ? "purchases and recorded preference" : "purchases") : "receipt"} behind this.</p>
            </div>
          </Stage>
        </div>
      </div>
    </Example>
  );
}

/* 2. Understand the business */

type CategoryId = "beans" | "equipment" | "tastings";
type StoreId = "harbor" | "market";
type Month = "april" | "may";
type CategoryRecord = { sales: number; cost: number };
type StoreMonth = { categories: Record<CategoryId, CategoryRecord>; discounts: number; returns: number };

const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: "beans", name: "Coffee beans" },
  { id: "equipment", name: "Brewing equipment" },
  { id: "tastings", name: "Tasting sessions" },
];
const STORE_NAMES: Record<StoreId, string> = { harbor: "Harbor Street", market: "Market Square" };

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

const roundedPercent = (value: number) => `${Math.round(value * 100)}%`;

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
    {
      name: "Products sold",
      result: `Brewing equipment is ${roundedPercent(equipment.market)} of Market Square's net sales, compared with ${roundedPercent(equipment.harbor)} at Harbor Street.`,
      tag: "Differs",
    },
    {
      name: "Recorded product costs",
      result: `Same cost list at both stores. Category margins: ${stores.market.categories.map((category) => `${category.name.toLowerCase()} ${roundedPercent(category.margin)}`).join(", ")}.`,
      tag: marginsMatch ? "Same" : "Differs",
    },
    {
      name: "Discounts",
      result: `${percent(stores.market.discountRate)} of sales before discounts at Market Square, ${percent(stores.harbor.discountRate)} at Harbor Street.`,
      tag: similar(stores.market.discountRate, stores.harbor.discountRate) ? "Similar" : "Differs",
    },
    {
      name: "Returns",
      result: `${percent(stores.market.returnRate)} at Market Square, ${percent(stores.harbor.returnRate)} at Harbor Street.`,
      tag: similar(stores.market.returnRate, stores.harbor.returnRate) ? "Similar" : "Differs",
    },
  ];

  return (
    <Example
      title="Two stores, similar sales"
      situation={<p>Net sales for {periodLabel}: <strong>{money(stores.harbor.sales)}</strong> at Harbor Street and <strong>{money(stores.market.sales)}</strong> at Market Square.</p>}
      finding={
        <button type="button" className={styles.findingButton} aria-pressed={open} aria-controls="retail-mix" onClick={() => setOpen(!open)}>
          <strong>A larger share of sales came from lower-margin products.</strong>
          <span>Supported by the sales records. It does not show why customers chose them or how staff sold them.</span>
          <span className={styles.findingAction}>{open ? "Hide the categories" : "Show the categories behind it"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
        </button>
      }
      next={<p>Review product mix and merchandising with the store manager. <span className={styles.muted}>Next question: is equipment more prominent at Market Square because of its customers, its displays, or its range?</span></p>}    >
      <div className={styles.questionRow}>
        <div>
          <p className={styles.sheetLabel}>The owner asks</p>
          <p className={styles.ownerQuestion}>&ldquo;Why is product gross margin lower at Market Square?&rdquo;</p>
        </div>
        <Segmented label="Period" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      </div>

      <div className={styles.storeTiles} role="group" aria-label="Choose a store">
        {(Object.keys(STORE_NAMES) as StoreId[]).map((id) => (
          <button key={id} type="button" className={styles.storeTile} aria-pressed={store === id} onClick={() => setStore(id)}>
            <span className={styles.sheetLabel}>{STORE_NAMES[id]}, {periodLabel}</span>
            <span className={styles.tileFigures}>
              <span><strong>{money(stores[id].sales)}</strong>Net sales</span>
              <span><strong>{percent(stores[id].margin)}</strong>Product gross margin</span>
            </span>
            <span className={styles.sheetMeta}>Gross profit on products {money(stores[id].grossProfit)}</span>
          </button>
        ))}
      </div>

      <div className={styles.investigation}>
        <div className={styles.sheet}>
          <p className={styles.sheetTitle}>What was checked</p>
          <ul className={styles.checks}>
            {checks.map((check) => (
              <li key={check.name}>
                <span className={styles.checkName}>{check.name}</span>
                <span className={styles.checkTag} data-tone={check.tag === "Differs" ? "flag" : "quiet"}>{check.tag}</span>
                <span className={styles.checkResult}>{check.result}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.sheet} aria-live="polite">
          <p className={styles.sheetTitle}>Records: {STORE_NAMES[store]}, {periodLabel}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Category</th><th>Net sales</th><th>Share</th><th>Product cost</th><th>Margin</th></tr></thead>
              <tbody>
                {shown.categories.map((category) => (
                  <tr key={category.id} data-highlight={open && category.id === lowestMargin.id}>
                    <td>{category.name}</td><td>{money(category.sales)}</td><td>{roundedPercent(category.share)}</td><td>{money(category.cost)}</td><td>{roundedPercent(category.margin)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td><td>{money(shown.sales)}</td><td>100%</td><td>{money(shown.cost)}</td><td>{percent(shown.margin)}</td></tr></tfoot>
            </table>
          </div>
          <p className={styles.sheetMeta}>Product gross margin is net sales minus recorded product cost. It leaves out rent, wages, and other operating costs, so it is not store profit.</p>
        </div>
      </div>

      {open && (
        <div id="retail-mix" className={styles.sheet}>
          <p className={styles.sheetTitle}>Share of net sales by category, {periodLabel}</p>
          <div className={styles.mix}>
            {(Object.keys(STORE_NAMES) as StoreId[]).map((id) => (
              <div key={id} className={styles.mixRow}>
                <span className={styles.mixStore}>{STORE_NAMES[id]}</span>
                <span className={styles.mixBar}>
                  {stores[id].categories.map((category) => (
                    <span key={category.id} data-category={category.id} style={{ flexBasis: `${category.share * 100}%` }}>{roundedPercent(category.share)}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <ul className={styles.legend}>
            {stores.market.categories.map((category) => <li key={category.id}><span data-category={category.id} aria-hidden="true" />{category.name}, {roundedPercent(category.margin)} margin</li>)}
          </ul>
          <p className={styles.evidenceNote}>Not established by these records: whether customers, displays, range, or staff caused the difference. That is the question for the store manager.</p>
        </div>
      )}
    </Example>
  );
}

/* 3. Plan the next visit */

const CHECK_DATE = "16 June";
const NEWER_PURCHASE = { date: "12 June", store: "Riverside", product: "house" as ProductId, day: 96 };
// Day 0 is 8 March, the first receipt. 16 June is day 100.
const HOUSE_DAYS = [
  { date: "8 Mar", day: 0 },
  { date: "6 Apr", day: 29 },
  { date: "5 May", day: 58 },
];

export function PlanTheNextVisit() {
  const [newer, setNewer] = useState<"none" | "found">("none");
  const [why, setWhy] = useState(false);
  const sequence = useSequence(4);
  const { step } = sequence;
  const found = newer === "found";
  const gap = 100 - HOUSE_DAYS[2].day;

  const checks = [
    { question: "More recent purchase?", result: found ? `Found: ${NEWER_PURCHASE.date}, ${NEWER_PURCHASE.store}, House Blend` : "None at any store since 5 May", state: found ? "stop" : "clear" },
    { question: "Existing order?", result: found ? "Not checked, no reminder needed" : "No open orders", state: found ? "skipped" : "clear" },
    { question: "Recent outreach?", result: found ? "Not checked, no reminder needed" : "No messages in the last 60 days", state: found ? "skipped" : "clear" },
    { question: "Communication preference?", result: found ? "Not checked, no reminder needed" : "Email, opted in to product updates on 8 March", state: found ? "skipped" : "clear" },
  ];

  return (
    <Example
      title={`Maya's record, checked ${CHECK_DATE}`}
      situation={found ? <p>A newer purchase appears in Maya&apos;s record.</p> : <p>Six weeks have passed since Maya&apos;s last recorded purchase.</p>}
      finding={found ? <p><strong>Recent purchase found — no reminder needed.</strong> The workflow decides not to contact her.</p> : <p><strong>May be ready for a refill.</strong> A draft is prepared for review. Nothing has been sent.</p>}
      next={found ? <p>No action. Her record is checked again after her next usual interval.</p> : <p>A team member edits, approves, or discards the draft.</p>}
    >
      <div className={styles.sequenceRow}>
        <Sequence stages={["Pattern", "Gap", "Checks", "Draft"]} {...sequence} />
        <Segmented label="Purchase record" options={[{ id: "none", label: "No newer purchase" }, { id: "found", label: "New purchase recorded" }]} value={newer} onChange={setNewer} />
      </div>

      <div className={styles.sheet}>
        <p className={styles.sheetTitle}><Mark product="house" />Maya&apos;s House Blend purchases</p>
        <div className={styles.timeline} role="img" aria-label={`House Blend bought on 8 March, 6 April, and 5 May, 29 days apart. ${found ? "A newer purchase on 12 June at Riverside." : `No purchase in the ${gap} days since, as of 16 June.`}`}>
          <span className={styles.track} />
          <Stage index={0} step={step} className={styles.timelineLayer}>
            {HOUSE_DAYS.slice(1).map((point, index) => (
              <span key={point.date} className={styles.interval} style={{ left: `${HOUSE_DAYS[index].day}%`, width: `${point.day - HOUSE_DAYS[index].day}%` }}>29 days</span>
            ))}
            {HOUSE_DAYS.map((point) => (
              <span key={point.date} className={styles.dot} style={{ left: `${point.day}%` }}><span>{point.date}</span></span>
            ))}
          </Stage>
          <Stage index={1} step={step} className={styles.timelineLayer}>
            <span className={styles.gap} data-found={found} style={{ left: `${HOUSE_DAYS[2].day}%`, width: `${(found ? NEWER_PURCHASE.day : 100) - HOUSE_DAYS[2].day}%` }}>
              {found ? "38 days" : `${gap} days, no purchase`}
            </span>
            {found && <span className={`${styles.dot} ${styles.dotNew}`} style={{ left: `${NEWER_PURCHASE.day}%` }}><span>12 Jun</span></span>}
            <span className={styles.today} style={{ left: "100%" }}><span>Checked {CHECK_DATE}</span></span>
          </Stage>
        </div>
        <div className={styles.patternGrid}>
          <Stage index={0} step={step}>
            <p className={styles.sheetLabel}>Observed pattern</p>
            <p className={styles.patternText}>House Blend purchased approximately monthly.</p>
          </Stage>
          <Stage index={1} step={step}>
            <p className={styles.sheetLabel}>{found ? "Latest record" : "Possible reason to reconnect"}</p>
            <p className={styles.patternText}>{found ? "Bought House Blend at Riverside on 12 June." : "May be ready for a refill."}</p>
            {!found && <p className={styles.evidenceNote}>Not known: how much coffee is left at home, or whether she bought coffee somewhere else.</p>}
          </Stage>
        </div>
        {!found && (
          <div className={`${styles.disclosure} ${why ? styles.disclosureOpen : ""}`}>
            <button type="button" aria-expanded={why} aria-controls="retail-why" onClick={() => setWhy(!why)}>
              <span>Why was this follow-up suggested?</span>
              <span className={styles.findingAction}>{why ? "Hide reasoning" : "Show reasoning"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
            </button>
            {why && (
              <ul id="retail-why">
                <li>Her three House Blend purchases were 29 days apart.</li>
                <li>On {CHECK_DATE}, it has been {gap} days since the last one, {gap - 29} days longer than usual.</li>
                <li>Three purchases make a short pattern. It suggests a reason to check in, not a fact about her.</li>
              </ul>
            )}
          </div>
        )}
      </div>

      <div className={styles.followGrid}>
        <Stage index={2} step={step} className={styles.sheet}>
          <p className={styles.sheetTitle}>Checked before preparing a message</p>
          <ul className={styles.followChecks}>
            {checks.map((check) => (
              <li key={check.question} data-state={check.state}>
                <span className={styles.checkIcon} aria-hidden="true">{check.state === "clear" ? <Check size={13} strokeWidth={2} /> : check.state === "stop" ? "!" : "–"}</span>
                <span><strong>{check.question}</strong>{check.result}</span>
              </li>
            ))}
          </ul>
        </Stage>
        <Stage index={3} step={step} className={styles.sheet}>
          {found ? (
            <div className={styles.suppressed}>
              <p className={styles.sheetLabel}>Outcome</p>
              <p className={styles.patternText}>Recent purchase found — no reminder needed.</p>
              <p className={styles.evidenceNote}>Maya bought House Blend at Riverside on 12 June. No draft was prepared.</p>
            </div>
          ) : (
            <div className={styles.draft}>
              <p className={styles.draftLabel}>Draft follow-up — awaiting review</p>
              <p className={styles.sheetMeta}>Email to Maya, her recorded preference</p>
              <p className={styles.draftText}>Hi Maya, would you like help choosing your next coffee? Your usual House Blend is available.</p>
              <p className={styles.sheetMeta}>Availability: 12 bags of House Blend at Harbor Street. Store inventory count, 08:00, {CHECK_DATE}.</p>
              <p className={styles.evidenceNote}>Staff can edit, approve, or discard this draft. Nothing is sent from this page.</p>
            </div>
          )}
        </Stage>
      </div>
    </Example>
  );
}

/* 4. Stock for demand */

type LocationId = "harbor" | "market" | "riverside";
type Location = { id: LocationId; name: string; stock: number; weeks: number[]; incoming: number; incomingNote?: string; reserve?: number; note: string };

// Reserve Blend, 250 g bags. Stock is the 08:00 count on 3 June; weekly sales are the four weeks to 2 June.
const LOCATIONS: Location[] = [
  { id: "harbor", name: "Harbor Street", stock: 6, weeks: [8, 9, 9, 10], incoming: 0, note: "Reserve Blend is one of the coffees staff suggest here. Those suggestions are not counted in the forecast." },
  { id: "market", name: "Market Square", stock: 40, weeks: [3, 4, 4, 5], incoming: 0, reserve: 16, note: "This store keeps a reserve of 16 bags, twice its forecast demand." },
  { id: "riverside", name: "Riverside", stock: 14, weeks: [5, 6, 6, 7], incoming: 12, incomingNote: "12 bags due in 6 days, confirmed by the roaster", note: "Its incoming order stays at Riverside and is not part of any transfer." },
];

const forecastOf = (location: Location) => {
  const total = location.weeks.reduce((sum, week) => sum + week, 0);
  return { recent: total, expected: (total / location.weeks.length) * 2, low: Math.min(...location.weeks) * 2, high: Math.max(...location.weeks) * 2 };
};

const harbor = LOCATIONS[0];
const market = LOCATIONS[1];
const TRANSFER = forecastOf(harbor).expected - harbor.stock - harbor.incoming;
const MARKET_AVAILABLE = market.stock - (market.reserve ?? 0);
const REORDER = { quantity: 24, leadDays: 10 };
const STORE_TOTAL = LOCATIONS.reduce((sum, location) => sum + location.stock, 0);
const DAYS_OF_COVER = Math.round(harbor.stock / (forecastOf(harbor).expected / 14));

type Option = "transfer" | "reorder";

function Shelf({ location, option }: { location: Location; option: Option }) {
  const forecast = forecastOf(location);
  const incomingProposed = option === "transfer" && location.id === "harbor" ? TRANSFER : 0;
  const leaving = option === "transfer" && location.id === "market" ? TRANSFER : 0;
  const onOrder = option === "reorder" && location.id === "harbor" ? REORDER.quantity : 0;
  const cells: string[] = [];
  for (let index = 0; index < location.stock; index += 1) cells.push(index >= location.stock - leaving ? "leaving" : "stock");
  for (let index = 0; index < incomingProposed; index += 1) cells.push("arriving");
  for (let index = 0; index < location.incoming; index += 1) cells.push("incoming");
  const shortfall = Math.max(0, forecast.expected - cells.filter((cell) => cell !== "leaving").length);
  for (let index = 0; index < shortfall; index += 1) cells.push("short");
  for (let index = 0; index < onOrder; index += 1) cells.push("ordered");
  return (
    <span className={styles.shelf} aria-hidden="true">
      {cells.map((cell, index) => <i key={index} data-cell={cell} />)}
    </span>
  );
}

export function StockForDemand() {
  const [selected, setSelected] = useState<LocationId>("harbor");
  const [option, setOption] = useState<Option>("transfer");
  const location = LOCATIONS.find((item) => item.id === selected) ?? harbor;
  const forecast = forecastOf(location);
  const after = (item: Location) => item.stock + (option === "transfer" ? (item.id === "harbor" ? TRANSFER : item.id === "market" ? -TRANSFER : 0) : 0);
  const totalAfter = LOCATIONS.reduce((sum, item) => sum + after(item), 0);

  const options = [
    { id: "transfer" as const, name: "Transfer", title: `Move ${TRANSFER} bags from Market Square`, facts: [["Lead time", "Next-day store run"], ["Available quantity", `${MARKET_AVAILABLE} bags above Market Square's reserve`], ["Tradeoff", `Market Square keeps ${market.stock - TRANSFER}, above its ${market.reserve}-bag reserve`]] },
    { id: "reorder" as const, name: "Reorder", title: `Order ${REORDER.quantity} bags from the roaster`, facts: [["Lead time", `${REORDER.leadDays} days, from the roaster's confirmation`], ["Available quantity", `Minimum order ${REORDER.quantity} bags, roaster confirms stock`], ["Tradeoff", `Harbor Street's ${harbor.stock} bags cover about ${DAYS_OF_COVER} days at its recent rate, so the order likely arrives after it runs out`]] },
  ];
  const chosen = options.find((item) => item.id === option) ?? options[0];

  const assumptions = [
    ["Available stock confirmed", `Market Square counted ${market.stock} bags at 08:00 today.`],
    ["Incoming orders considered", "None due at Harbor Street or Market Square. Riverside's 12 bags stay at Riverside."],
    ["Receiving store's expected need reviewed", `Harbor Street forecast: about ${forecastOf(harbor).expected} bags over two weeks (${forecastOf(harbor).low}–${forecastOf(harbor).high}).`],
    ["Sending store retains a defined reserve", `Market Square keeps ${market.stock - TRANSFER} bags. Its reserve is ${market.reserve}.`],
  ];

  return (
    <Example
      title="Reserve Blend across three stores, 3 June"
      situation={<p>Harbor Street has {harbor.stock} bags against a forecast of about {forecastOf(harbor).expected}. Market Square has {market.stock} against about {forecastOf(market).expected}.</p>}
      finding={<p><strong>A transfer proposal for review:</strong> {TRANSFER} bags from Market Square to Harbor Street. Nothing has been moved or ordered.</p>}
      next={<p>Manager confirms quantities and timing.</p>}
      findingLabel="Result for review"
    >
      <div className={styles.questionRow}>
        <div>
          <p className={styles.sheetLabel}><Mark product="reserve" />Reserve Blend, 250 g bags</p>
          <p className={styles.ownerQuestion}>Transfer stock or place another order?</p>
        </div>
        <ul className={styles.stockLegend} aria-label="Key">
          <li><i data-cell="stock" aria-hidden="true" />Recorded stock</li>
          <li><i data-cell="incoming" aria-hidden="true" />Confirmed incoming</li>
          <li><i data-cell="short" aria-hidden="true" />Forecast need not covered</li>
          <li><i data-cell="arriving" aria-hidden="true" />Proposed to arrive</li>
          <li><i data-cell="leaving" aria-hidden="true" />Proposed to leave</li>
        </ul>
      </div>

      <div className={styles.locations} role="group" aria-label="Choose a store">
        {LOCATIONS.map((item) => {
          const itemForecast = forecastOf(item);
          const changed = after(item) !== item.stock;
          return (
            <button key={item.id} type="button" className={styles.location} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
              <span className={styles.locationName}>{item.name}</span>
              <Shelf location={item} option={option} />
              <span className={styles.facts}>
                <span><em>Current stock</em><strong>{item.stock}{changed && <b> → {after(item)} if approved</b>}</strong><small>Recorded, 08:00 count</small></span>
                <span><em>Recent sales</em><strong>{itemForecast.recent}</strong><small>Recorded, last 4 weeks</small></span>
                <span data-estimate="true"><em>Forecast demand</em><strong>~{itemForecast.expected}</strong><small>Estimate, next 2 weeks ({itemForecast.low}–{itemForecast.high})</small></span>
                <span><em>Incoming order</em><strong>{item.incoming || "None"}</strong><small>{item.incomingNote ?? "No confirmed order"}</small></span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.evidence} aria-live="polite">
        <p className={styles.sheetLabel}>Behind the forecast: {location.name}</p>
        <ol className={styles.weeks}>
          {location.weeks.map((week, index) => <li key={index}><span>Week {index + 1}</span><strong>{week}</strong></li>)}
        </ol>
        <p className={styles.evidenceNote}>
          {forecast.recent} bags in four weeks is {forecast.recent / location.weeks.length} a week, so about {forecast.expected} over the next two. The range uses the slowest and fastest week. {location.note}
        </p>
      </div>

      <div className={styles.options} role="group" aria-label="Compare options">
        {options.map((item) => (
          <button key={item.id} type="button" className={styles.option} aria-pressed={option === item.id} onClick={() => setOption(item.id)}>
            <span className={styles.optionName}>{item.name}</span>
            <span className={styles.optionTitle}>{item.title}</span>
            <span className={styles.optionFacts}>
              {item.facts.map(([label, value]) => <span key={label}><em>{label}</em>{value}</span>)}
            </span>
          </button>
        ))}
      </div>

      <div className={styles.sheet} aria-live="polite">
        {option === "transfer" ? (
          <>
            <p className={styles.sheetTitle}>Assumptions behind the transfer proposal</p>
            <ul className={styles.assumptions}>
              {assumptions.map(([label, value]) => <li key={label}><Check size={14} strokeWidth={2} aria-hidden="true" /><span><strong>{label}</strong>{value}</span></li>)}
            </ul>
          </>
        ) : (
          <>
            <p className={styles.sheetTitle}>{chosen.title}</p>
            <p className={styles.evidenceNote}>A reorder adds new bags from the roaster in {REORDER.leadDays} days. It could follow a transfer for the next cycle, once the manager has reviewed demand again.</p>
          </>
        )}
        <p className={styles.total}>
          {option === "transfer"
            ? `Across the three stores: ${STORE_TOTAL} bags now and ${totalAfter} after the transfer. Bags move between stores; none are created or lost.`
            : `Across the three stores: ${STORE_TOTAL} bags now. A reorder would add ${REORDER.quantity} from the roaster when it arrives.`}
        </p>
      </div>
    </Example>
  );
}
