"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { Play, Square } from "lucide-react";
import styles from "./logistics.module.css";
import { Choice, Example } from "./logistics-visuals";
import { formatKg, formatSize, loadStops, operation, places, plans, shipments, totalWeight, vehicles } from "./logistics-data";
import { arrangements, blockersAt, blockingKeys, CARGO, items, laneY, placements, ROWS, rowX, transitionMoves, viewLabels, type ArrangementId, type ViewId } from "./logistics-load-plan";
import type { SceneChip } from "./logistics-load-scene";

const LoadScene = dynamic(() => import("./logistics-load-scene"), { ssr: false });

function subscribeToMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
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

function useInView(target: RefObject<HTMLElement | null>, rootMargin: string, once = false) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (once && entry.isIntersecting) observer.disconnect();
    }, { rootMargin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, rootMargin, once]);
  return inView;
}

const stepLabels = ["At the depot", ...loadStops.map(({ stop, shipment }) => `Stop ${stop} · ${places[shipments[shipment].to].name}`)];
const loadTone: Record<string, string> = { "KV-2041": "#e6e4df", "KV-2042": "#c9b28c", "KV-2043": "#a3a6a9" };

// Plan view of the same state, drawn from the same placements as the 3D
// scene. It renders first, and stays when WebGL is unavailable.
function LoadPlanView({ arrangement, step, selected, onSelect }: { arrangement: ArrangementId; step: number; selected: string; onSelect: (shipment: string) => void }) {
  const scale = 56;
  const minX = -2.5;
  const minY = -2.9;
  const toX = (x: number) => (x - minX) * scale;
  const toY = (y: number) => (y - minY) * scale;
  const rest = placements(arrangement, step);
  const stop = items.find((item) => item.shipment === selected)?.stop ?? 1;
  const blocking = new Set(blockingKeys(arrangement, stop));
  return (
    <svg viewBox={`0 0 ${(14.6 * scale).toFixed(0)} ${(8.3 * scale).toFixed(0)}`} className={styles.planView} role="img" aria-label="Plan view of Vehicle B’s cargo floor and the dock behind it.">
      <rect x={toX(CARGO.length + 0.12)} y={toY(-2.8)} width={5.48 * scale} height={(CARGO.width + 5.6) * scale} className={styles.planDock} />
      <rect x={toX(-2.25)} y={toY(-0.04)} width={2.1 * scale} height={(CARGO.width + 0.08) * scale} className={styles.planCab} />
      <rect x={toX(0)} y={toY(0)} width={CARGO.length * scale} height={CARGO.width * scale} className={styles.planBody} />
      {Array.from({ length: ROWS * 2 }, (_, index) => {
        const lane = (index % 2) as 0 | 1;
        return <rect key={index} x={toX(rowX(Math.floor(index / 2)))} y={toY(laneY[lane])} width={1.2 * scale} height={scale} className={styles.planSlot} />;
      })}
      <text x={toX(-1.2)} y={toY(CARGO.width / 2) + 6} textAnchor="middle" className={styles.planText}>Cab</text>
      <text x={toX(CARGO.length + 2.9)} y={toY(CARGO.width + 2.2)} textAnchor="middle" className={styles.planText}>Dock</text>
      {items.map((item) => {
        const point = rest[item.key];
        if (point.gone) return null;
        const isSelected = item.shipment === selected;
        return (
          <g key={item.key} onClick={() => onSelect(item.shipment)} className={styles.planPallet} data-selected={isSelected || undefined} data-blocking={blocking.has(item.key) || undefined} style={{ "--tone": loadTone[item.shipment] } as CSSProperties}>
            <rect x={toX(point.x)} y={toY(point.y)} width={1.2 * scale} height={scale} rx={4} />
            <text x={toX(point.x + 0.6)} y={toY(point.y + 0.5) + 8} textAnchor="middle">{item.stop}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function LoadPlan() {
  const [arrangement, setArrangement] = useState<ArrangementId>("initial");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState("KV-2041");
  const [view, setView] = useState<ViewId | null>("angle");
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const webgl = useSyncExternalStore(noSubscription, detectWebGL, () => false);
  const frame = useRef<HTMLDivElement>(null);
  // Fetch the 3D scene once the example nears the viewport, and render only while it is on screen.
  const mounted = useInView(frame, "600px 0px", true);
  const visible = useInView(frame, "0px");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const stopPlaying = () => { clearTimeout(timer.current); setPlaying(false); };
  const play = () => {
    clearTimeout(timer.current);
    setPlaying(true);
    setStep(0);
    const advance = (next: number) => {
      if (next > loadStops.length) { setPlaying(false); return; }
      setStep(next);
      timer.current = setTimeout(() => advance(next + 1), transitionMoves(arrangement, next).total + 1200);
    };
    timer.current = setTimeout(() => advance(1), 600);
  };
  const chooseStep = (next: number) => { stopPlaying(); setStep(next); };
  const chooseArrangement = (next: ArrangementId) => { stopPlaying(); setArrangement(next); };

  const slots = arrangements[arrangement];
  const blockers = step > 0 ? blockersAt(arrangement, step) : 0;
  const stepShipment = step > 0 ? loadStops[step - 1].shipment : null;
  const caption = step === 0
    ? arrangement === "initial"
      ? "Loaded at the depot. All seven pallets fit, but KV-2041 for the first stop is at the front, behind freight for stops 2 and 3."
      : "Loaded at the depot. Freight for the last stop goes in first, so KV-2041 for the first stop sits nearest the door."
    : blockers > 0
      ? `${stepLabels[step]}. ${blockers} pallets for later stops come off and go back on before ${stepShipment} can be unloaded.`
      : `${stepLabels[step]}. ${stepShipment} comes straight off. Nothing for later stops is moved.${step === loadStops.length ? ` The truck is now empty for KV-2046 at ${places.glenway.name}.` : ""}`;
  const captionTone = (step === 0 && arrangement === "initial") || blockers > 0 ? "alert" : "ok";
  const selectedShipment = shipments[selected];
  const selectedStop = loadStops.find((entry) => entry.shipment === selected)?.stop ?? 1;
  const selectedRows = [...new Set(items.filter((item) => item.shipment === selected).map((item) => slots[item.key].row + 1))].sort((a, b) => a - b);
  const selectedBlockers = blockersAt(arrangement, selectedStop);
  const delivered = step >= selectedStop;
  const loadWeight = loadStops.reduce((sum, entry) => sum + totalWeight(shipments[entry.shipment]), 0);
  const chip: SceneChip | null = delivered ? null : {
    title: `${selected} · Stop ${selectedStop}`,
    detail: selectedBlockers > 0 ? `Blocked by ${selectedBlockers} pallets for later stops` : "Clear path to the door",
    tone: selectedBlockers > 0 ? "alert" : "ok",
  };
  const live = mounted && webgl;

  return (
    <Example
      title={`Vehicle B loading plan · ${operation.name} (fictional)`}
      note="Illustration only, not a certified loading plan"
      outcome={{
        start: <p><strong>Seven pallets for three stops,</strong> with dimensions, weights, stacking rules, and delivery order.</p>,
        findingLabel: "Result for review",
        finding: <p>The first delivery is loaded behind later deliveries. The proposed arrangement keeps it by the door: <strong>a loading sequence to review.</strong></p>,
        next: <p><strong>Warehouse team checks the plan before loading,</strong> including weight distribution and securement, which this illustration does not assess.</p>,
      }}
    >
      <Choice
        label="Arrangement"
        value={arrangement}
        onChange={chooseArrangement}
        options={[
          { value: "initial", label: "Initial arrangement", detail: "The first-stop shipment is blocked by other freight." },
          { value: "proposed", label: "Proposed arrangement", detail: "The first-stop shipment can be reached without removing the later deliveries." },
        ]}
      />
      <div className={styles.loadGrid}>
        <div className={styles.sceneSheet}>
          <div ref={frame} className={styles.viewport} data-live={(live && ready) || undefined}>
            <div className={styles.planLayer} aria-hidden={live && ready ? true : undefined}>
              <LoadPlanView arrangement={arrangement} step={step} selected={selected} onSelect={setSelected} />
              {!webgl && mounted && <p className={styles.planNote}>Plan view. The 3D view needs WebGL.</p>}
            </div>
            {live && (
              <LoadScene
                arrangement={arrangement}
                step={step}
                selected={selected}
                view={view}
                active={visible}
                reducedMotion={reducedMotion}
                chip={chip}
                label={`Vehicle B’s cargo space, ${arrangement} arrangement. Drag or use the arrow keys to turn the view.`}
                onSelect={setSelected}
                onFreeView={() => setView(null)}
                onReady={() => setReady(true)}
              />
            )}
          </div>
          <div className={styles.sceneControls}>
            <div role="group" aria-label="Camera" className={styles.cameraButtons} data-disabled={!(live && ready) || undefined}>
              {(Object.keys(viewLabels) as ViewId[]).map((id) => (
                <button key={id} type="button" aria-pressed={view === id} disabled={!(live && ready)} onClick={() => setView(id)}>{viewLabels[id]}</button>
              ))}
            </div>
            {live && ready && <span className={styles.sceneHint}>Drag to turn</span>}
          </div>
          <div className={styles.sequence}>
            <div role="group" aria-label="Delivery sequence" className={styles.stepButtons}>
              {stepLabels.map((label, index) => (
                <button key={label} type="button" aria-pressed={step === index} onClick={() => chooseStep(index)}>{label}</button>
              ))}
            </div>
            {!reducedMotion && (
              <button type="button" className={styles.playButton} onClick={playing ? stopPlaying : play}>
                {playing ? <Square size={13} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                {playing ? "Stop" : "Play the stops"}
              </button>
            )}
          </div>
          <p id="load-caption" className={styles.loadCaption} aria-live="polite" data-tone={captionTone}>{caption}</p>
        </div>
        <div className={styles.loadSide}>
          <div className={styles.sheet}>
            <p className={styles.columnTitle}>Cargo for Vehicle B</p>
            <div role="group" aria-label="Select a shipment" className={styles.manifest}>
              {loadStops.map(({ stop, shipment: id }) => (
                <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}>
                  <span className={styles.manifestStop}>{stop}</span>
                  <span className={styles.manifestId}>{id}<span>{places[shipments[id].to].name} · {shipments[id].pallets} pallets</span></span>
                </button>
              ))}
            </div>
            <dl className={styles.facts} aria-live="polite">
              <div><dt>Delivery stop</dt><dd>Stop {selectedStop}, {places[selectedShipment.to].name}, {selectedShipment.deliveryWindow[0]}–{selectedShipment.deliveryWindow[1]}</dd></div>
              <div><dt>Dimensions</dt><dd>{formatSize(selectedShipment)} per pallet</dd></div>
              <div><dt>Weight</dt><dd>{formatKg(selectedShipment.pallet.weightKg)} per pallet, {formatKg(totalWeight(selectedShipment))} total</dd></div>
              <div><dt>Can be stacked?</dt><dd>{selectedShipment.stackable}</dd></div>
              <div><dt>Position</dt><dd>{selectedRows.length > 1 ? "Rows" : "Row"} {selectedRows.join(" and ")} of {ROWS}, from the front</dd></div>
              <div><dt>Reachable at its stop</dt><dd data-tone={selectedBlockers > 0 ? "alert" : "ok"}>{selectedBlockers > 0 ? `No. ${selectedBlockers} pallets for later stops are in the way.` : "Yes, without moving later freight."}</dd></div>
            </dl>
          </div>
          <div className={styles.sheet}>
            <p className={styles.columnTitle}>Pallets moved to reach each delivery</p>
            <table className={styles.compareTable}>
              <thead><tr><th scope="col">Delivery</th><th scope="col">Initial</th><th scope="col">Proposed</th></tr></thead>
              <tbody>
                {loadStops.map(({ stop, shipment }) => (
                  <tr key={stop}>
                    <th scope="row">Stop {stop} · {shipment}</th>
                    <td data-tone={blockersAt("initial", stop) > 0 ? "alert" : undefined}>{blockersAt("initial", stop)}</td>
                    <td>{blockersAt("proposed", stop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.sameCargo}>
              Same freight in both: {items.length} pallets, {formatKg(loadWeight)}, {items.length} of {vehicles.B.palletSpaces} floor spaces, nothing stacked. KV-2046 is collected at stop 4, once this freight is off; Vehicle B never carries more than {plans.requestOnB.maxOnBoard} pallets.
            </p>
          </div>
        </div>
      </div>
    </Example>
  );
}
