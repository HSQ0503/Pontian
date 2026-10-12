"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { Play, Square } from "lucide-react";
import styles from "./logistics.module.css";
import { Choice, Example } from "./logistics-visuals";
import { formatKg, formatSize, loadStops, operation, places, shipments, totalWeight } from "./logistics-data";
import { blockersAt, blockingKeys, CARGO, items, laneY, loadLayout, loadSceneItems, ROWS, rowX, viewLabels, type ArrangementId, type FloorMark, type Placement, type SceneItem, type SceneLayout, type SceneTone, type ViewId } from "./logistics-load-plan";
import type { SceneChip } from "./logistics-load-scene";

const LoadScene = dynamic(() => import("./logistics-load-scene"), { ssr: false });

function subscribeToMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
export const useReducedMotion = () => useSyncExternalStore(subscribeToMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);

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

const sceneTone: Record<string, string> = { "KV-2041": "#e6e4df", "KV-2042": "#c9b28c", "KV-2043": "#a3a6a9", "KV-2044": "#dcd6ca", "KV-2045": "#bfc3c6" };

// Plan view of the same state. It renders first and stays when WebGL is off.
function PlanView({ items: sceneItems, placements, tones, marks, onSelect }: { items: SceneItem[]; placements: Record<string, Placement>; tones: Record<string, SceneTone>; marks: FloorMark[]; onSelect: (shipment: string) => void }) {
  const scale = 56;
  const toX = (x: number) => (x + 2.5) * scale;
  const toY = (y: number) => (y + 2.9) * scale;
  return (
    <svg viewBox={`0 0 ${(14.6 * scale).toFixed(0)} ${(8.3 * scale).toFixed(0)}`} className={styles.planView} role="img" aria-label="Plan view of Vehicle B’s cargo floor and the dock behind it.">
      <rect x={toX(CARGO.length + 0.12)} y={toY(-1.6)} width={5.28 * scale} height={(CARGO.width + 3.2) * scale} className={styles.planDock} />
      <rect x={toX(-2.25)} y={toY(-0.04)} width={2.1 * scale} height={(CARGO.width + 0.08) * scale} className={styles.planCab} />
      <rect x={toX(0)} y={toY(0)} width={CARGO.length * scale} height={CARGO.width * scale} className={styles.planBody} />
      {Array.from({ length: ROWS * 2 }, (_, index) => {
        const lane = (index % 2) as 0 | 1;
        return <rect key={index} x={toX(rowX(Math.floor(index / 2)))} y={toY(laneY[lane])} width={1.2 * scale} height={scale} className={styles.planSlot} />;
      })}
      {marks.map((mark) => <rect key={`${mark.x}-${mark.y}`} x={toX(mark.x)} y={toY(mark.y)} width={mark.length * scale} height={mark.width * scale} className={styles.planMark} data-tone={mark.tone} />)}
      {sceneItems.map((item) => {
        const point = placements[item.key];
        if (!point || point.gone) return null;
        return (
          <g key={item.key} onClick={() => onSelect(item.shipment)} className={styles.planPallet} data-tone={tones[item.key] ?? "none"} style={{ "--tone": sceneTone[item.shipment] } as CSSProperties}>
            <rect x={toX(point.x)} y={toY(point.y)} width={1.2 * scale} height={scale} rx={4} />
            <text x={toX(point.x + 0.6)} y={toY(point.y + 0.5) + 9} textAnchor="middle">{item.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function CargoView({ items: sceneItems, layout, tones, anchor, marks, chip, label, onSelect, cameras = true, initialView = "angle" }: {
  items: SceneItem[];
  layout: SceneLayout;
  tones: Record<string, SceneTone>;
  anchor: string | null;
  marks: FloorMark[];
  chip: SceneChip | null;
  label: string;
  onSelect: (shipment: string) => void;
  cameras?: boolean;
  initialView?: ViewId;
}) {
  const reducedMotion = useReducedMotion();
  const webgl = useSyncExternalStore(noSubscription, detectWebGL, () => false);
  const frame = useRef<HTMLDivElement>(null);
  // Fetch the scene once the example nears the viewport; render only while it is on screen.
  const mounted = useInView(frame, "600px 0px", true);
  const visible = useInView(frame, "0px");
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewId | null>(initialView);
  const live = mounted && webgl;
  return (
    <>
      <div ref={frame} className={styles.viewport} data-live={(live && ready) || undefined}>
        <div className={styles.planLayer} aria-hidden={live && ready ? true : undefined}>
          <PlanView items={sceneItems} placements={layout.placements} tones={tones} marks={marks} onSelect={onSelect} />
          {!webgl && mounted && <p className={styles.planNote}>Plan view. The 3D view needs WebGL.</p>}
        </div>
        {live && (
          <LoadScene
            items={sceneItems}
            layout={layout}
            tones={tones}
            anchor={anchor}
            marks={marks}
            view={view}
            active={visible}
            reducedMotion={reducedMotion}
            chip={chip}
            label={label}
            onSelect={onSelect}
            onFreeView={() => setView(null)}
            onReady={() => setReady(true)}
          />
        )}
      </div>
      {cameras && (
        <div className={styles.sceneControls}>
          <div role="group" aria-label="Camera" className={styles.cameraButtons}>
            {(Object.keys(viewLabels) as ViewId[]).map((id) => (
              <button key={id} type="button" aria-pressed={view === id} disabled={!(live && ready)} onClick={() => setView(id)}>{viewLabels[id]}</button>
            ))}
          </div>
          {live && ready && <span className={styles.sceneHint}>Drag to turn</span>}
        </div>
      )}
    </>
  );
}

const stepLabels = ["At the depot", ...loadStops.map(({ stop, shipment }) => `Stop ${stop} · ${places[shipments[shipment].to].name}`)];
const words = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];

export function LoadPlan() {
  const [arrangement, setArrangement] = useState<ArrangementId>("initial");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState("KV-2041");
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const layout = useMemo(() => loadLayout(arrangement, step), [arrangement, step]);
  const stopPlaying = () => { clearTimeout(timer.current); setPlaying(false); };
  const play = () => {
    clearTimeout(timer.current);
    setPlaying(true);
    setStep(0);
    const advance = (next: number) => {
      if (next > loadStops.length) { setPlaying(false); return; }
      setStep(next);
      timer.current = setTimeout(() => advance(next + 1), (loadLayout(arrangement, next).transition?.total ?? 0) + 1200);
    };
    timer.current = setTimeout(() => advance(1), 600);
  };

  const selectedStop = loadStops.find((entry) => entry.shipment === selected)?.stop ?? 1;
  const selectedShipment = shipments[selected];
  const selectedBlockers = blockersAt(arrangement, selectedStop);
  const blocking = new Set(blockingKeys(arrangement, selectedStop));
  const tones = Object.fromEntries(items.map((item) => [item.key, item.shipment === selected ? "selected" : blocking.has(item.key) ? "blocking" : "none"])) as Record<string, SceneTone>;
  const anchor = items.filter((item) => item.shipment === selected && !layout.placements[item.key].gone).sort((a, b) => layout.placements[b.key].x - layout.placements[a.key].x)[0]?.key ?? null;
  const marks: FloorMark[] = selectedBlockers === 0 && step < selectedStop
    ? items.filter((item) => item.shipment === selected && !layout.placements[item.key].staged).flatMap((item) => {
      const point = layout.placements[item.key];
      const from = point.x + 1.2;
      return from < CARGO.length - 0.05 ? [{ x: from, y: point.y, length: CARGO.length - from, width: 1, tone: "ok" as const }] : [];
    })
    : [];
  const chip: SceneChip | null = step >= selectedStop ? null : {
    title: `${selected} · Stop ${selectedStop}`,
    detail: selectedBlockers > 0 ? `Blocked by ${selectedBlockers} pallets` : "Clear path to the door",
    tone: selectedBlockers > 0 ? "alert" : "ok",
  };

  const blockers = step > 0 ? blockersAt(arrangement, step) : 0;
  const stepShipment = step > 0 ? loadStops[step - 1].shipment : null;
  const caption = step === 0
    ? arrangement === "initial"
      ? "Everything fits. But the first drop is at the front, behind five pallets for later stops."
      : "Same seven pallets. The first drop now sits by the door."
    : blockers > 0
      ? `${stepLabels[step]}. ${words[blockers]} pallets come off and go back on before ${stepShipment} can leave the truck.`
      : `${stepLabels[step]}. ${stepShipment} comes straight off.${step === loadStops.length ? ` The truck is empty for the ${places.glenway.name} pickup.` : ""}`;

  return (
    <Example
      title={`Vehicle B, loaded for three stops · ${operation.name} (fictional)`}
      note="Illustration, not a certified loading plan"
      outcome={{
        start: <p>Seven pallets for three drops, and the order Vehicle B delivers them.</p>,
        finding: <p><strong>The first delivery is loaded behind later deliveries.</strong> The proposed arrangement fixes that.</p>,
        next: <p><strong>Warehouse team checks the plan before loading,</strong> including weight and securing, which this doesn’t assess.</p>,
      }}
    >
      <Choice
        label="Arrangement"
        value={arrangement}
        onChange={(next) => { stopPlaying(); setArrangement(next); }}
        options={[
          { value: "initial", label: "As loaded" },
          { value: "proposed", label: "Proposed" },
        ]}
      />
      <div className={styles.loadGrid}>
        <div className={styles.sceneSheet}>
          <CargoView
            items={loadSceneItems}
            layout={layout}
            tones={tones}
            anchor={anchor}
            marks={marks}
            chip={chip}
            label={`Vehicle B’s cargo space, ${arrangement} arrangement. Drag or use the arrow keys to turn the view.`}
            onSelect={setSelected}
          />
          <div className={styles.sequence}>
            <div role="group" aria-label="Delivery sequence" className={styles.stepButtons}>
              {stepLabels.map((label, index) => (
                <button key={label} type="button" aria-pressed={step === index} onClick={() => { stopPlaying(); setStep(index); }}>{label}</button>
              ))}
            </div>
            {!reducedMotion && (
              <button type="button" className={styles.playButton} onClick={playing ? stopPlaying : play}>
                {playing ? <Square size={13} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                {playing ? "Stop" : "Play the stops"}
              </button>
            )}
          </div>
          <p className={styles.loadCaption} aria-live="polite" data-tone={(step === 0 && arrangement === "initial") || blockers > 0 ? "alert" : "ok"}>{caption}</p>
        </div>
        <div className={styles.loadSide}>
          <div className={styles.sheet}>
            <div role="group" aria-label="Select a shipment" className={styles.manifest}>
              {loadStops.map(({ stop, shipment: id }) => (
                <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}>
                  <span className={styles.manifestStop}>{stop}</span>
                  <span className={styles.manifestId}>{id}<span>{places[shipments[id].to].name} · {shipments[id].pallets} pallets</span></span>
                </button>
              ))}
            </div>
            <p className={styles.manifestNote} aria-live="polite">{formatSize(selectedShipment)} · {formatKg(totalWeight(selectedShipment))} · {selectedShipment.stackable}</p>
          </div>
        </div>
      </div>
    </Example>
  );
}
