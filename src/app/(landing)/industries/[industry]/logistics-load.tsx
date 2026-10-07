"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Play, Square } from "lucide-react";
import styles from "./logistics.module.css";
import { Choice, Example } from "./logistics-visuals";
import { formatKg, formatSize, loadStops, operation, places, plans, shipments, totalWeight, vehicles } from "./logistics-data";

type ArrangementId = "initial" | "proposed";
type Lane = 0 | 1;
type Slot = { row: number; lane: Lane };
type Point = { x: number; y: number };
type Item = { key: string; shipment: string; stop: number };

const PX_PER_M = 44;
const CARGO = vehicles.B.cargo;
const ROWS = 5;
const PALLET_BASE = 0.14;
const rowX = (row: number) => 0.05 + row * 1.22;
const laneY: Record<Lane, number> = { 0: 0.15, 1: 1.3 };
const DOOR_X = CARGO.length + 0.1;
const stageX = (index: number) => CARGO.length + 1.5 + index * 1.3;
const exitY: Record<Lane, number> = { 0: -1.35, 1: CARGO.width + 0.25 };
const CENTER: Point = { x: 4.9, y: 1.2 };
const MS_PER_M = 150;
const FADE_MS = 260;

const items: Item[] = loadStops.flatMap(({ stop, shipment }) =>
  Array.from({ length: shipments[shipment].pallets }, (_, index) => ({ key: `${shipment}-${index + 1}`, shipment, stop })),
);

// Both arrangements use the same seven floor positions and stack nothing;
// only which pallet sits where changes.
const arrangements: Record<ArrangementId, Record<string, Slot>> = {
  initial: {
    "KV-2041-1": { row: 0, lane: 0 }, "KV-2041-2": { row: 0, lane: 1 },
    "KV-2042-1": { row: 1, lane: 0 }, "KV-2042-2": { row: 1, lane: 1 }, "KV-2042-3": { row: 2, lane: 0 },
    "KV-2043-1": { row: 2, lane: 1 }, "KV-2043-2": { row: 3, lane: 0 },
  },
  proposed: {
    "KV-2043-1": { row: 0, lane: 0 }, "KV-2043-2": { row: 0, lane: 1 },
    "KV-2042-1": { row: 1, lane: 0 }, "KV-2042-2": { row: 1, lane: 1 }, "KV-2042-3": { row: 2, lane: 0 },
    "KV-2041-1": { row: 3, lane: 0 }, "KV-2041-2": { row: 2, lane: 1 },
  },
};

const slotPoint = (slot: Slot): Point => ({ x: rowX(slot.row), y: laneY[slot.lane] });

type Action = { key: string; kind: "stage" | "deliver"; lane: Lane; stageIndex: number };

// Unloading works from the door inward, lane by lane. Freight for a later
// stop that sits between the door and this stop's freight moves straight
// back along its lane to the space behind the truck, and is reloaded the
// same way before the truck drives on.
function stopActions(arrangement: ArrangementId, stop: number): Action[] {
  const slots = arrangements[arrangement];
  return ([0, 1] as Lane[]).flatMap((lane) => {
    const inLane = items.filter((item) => item.stop >= stop && slots[item.key].lane === lane).sort((a, b) => slots[b.key].row - slots[a.key].row);
    const target = inLane.filter((item) => item.stop === stop);
    if (target.length === 0) return [];
    const deepest = Math.min(...target.map((item) => slots[item.key].row));
    const sequence = inLane.filter((item) => slots[item.key].row >= deepest);
    const staged = sequence.filter((item) => item.stop !== stop);
    return sequence.map((item): Action => item.stop === stop
      ? { key: item.key, kind: "deliver", lane, stageIndex: -1 }
      : { key: item.key, kind: "stage", lane, stageIndex: staged.length - 1 - staged.indexOf(item) });
  });
}

const blockersAt = (arrangement: ArrangementId, stop: number) => stopActions(arrangement, stop).filter((action) => action.kind === "stage").length;

type Placement = Point & { gone: boolean; staged: boolean };

function placements(arrangement: ArrangementId, step: number): Record<string, Placement> {
  const slots = arrangements[arrangement];
  const actions = step > 0 ? stopActions(arrangement, step) : [];
  return Object.fromEntries(items.map((item) => {
    const slot = slots[item.key];
    const action = actions.find((entry) => entry.key === item.key);
    if (item.stop < step || action?.kind === "deliver") return [item.key, { x: DOOR_X, y: exitY[slot.lane], gone: true, staged: false }];
    if (action?.kind === "stage") return [item.key, { x: stageX(action.stageIndex), y: laneY[slot.lane], gone: false, staged: true }];
    return [item.key, { ...slotPoint(slot), gone: false, staged: false }];
  }));
}

type Move = { key: string; path: Point[]; delay: number; duration: number; fade: boolean };

const pathLength = (path: Point[]) => path.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - path[index].x, point.y - path[index].y), 0);

// Lanes unload in parallel; within a lane each pallet waits for the one in
// front, so nothing passes through other freight.
function transitionMoves(arrangement: ArrangementId, step: number): { moves: Move[]; total: number } {
  const slots = arrangements[arrangement];
  const reload = step > 1 ? stopActions(arrangement, step - 1).filter((action) => action.kind === "stage") : [];
  const current = stopActions(arrangement, step);
  const moves: Move[] = [];
  let total = 0;
  ([0, 1] as Lane[]).forEach((lane) => {
    let cursor = 0;
    const push = (key: string, path: Point[], fade = false) => {
      const travel = Math.round(220 + pathLength(path) * MS_PER_M);
      moves.push({ key, path, delay: cursor, duration: travel + (fade ? FADE_MS : 0), fade });
      cursor += travel + 60;
    };
    reload.filter((action) => action.lane === lane).sort((a, b) => a.stageIndex - b.stageIndex).forEach((action) => {
      push(action.key, [{ x: stageX(action.stageIndex), y: laneY[lane] }, slotPoint(slots[action.key])]);
    });
    current.filter((action) => action.lane === lane).forEach((action) => {
      const from = slotPoint(slots[action.key]);
      if (action.kind === "stage") push(action.key, [from, { x: stageX(action.stageIndex), y: from.y }]);
      else push(action.key, [from, { x: DOOR_X, y: from.y }, { x: DOOR_X, y: exitY[lane] }], true);
    });
    total = Math.max(total, cursor + FADE_MS);
  });
  return { moves, total };
}

const px = (metres: number) => metres * PX_PER_M;
const toPx = (point: Point, z = 0) => `translate3d(${px(point.x - CENTER.x).toFixed(1)}px, ${px(point.y - CENTER.y).toFixed(1)}px, ${px(z).toFixed(1)}px)`;

function Box({ length, width, height, z = 0, className, top }: { length: number; width: number; height: number; z?: number; className?: string; top?: ReactNode }) {
  const style = { "--l": `${px(length)}px`, "--w": `${px(width)}px`, "--h": `${px(height)}px`, transform: `translateZ(${px(z)}px)` } as CSSProperties;
  return (
    <div className={`${styles.box} ${className ?? ""}`} style={style}>
      <div className={`${styles.face} ${styles.faceNorth}`} />
      <div className={`${styles.face} ${styles.faceWest}`} />
      <div className={`${styles.face} ${styles.faceSouth}`} />
      <div className={`${styles.face} ${styles.faceEast}`} />
      <div className={`${styles.face} ${styles.faceTop}`}>{top}</div>
    </div>
  );
}

function Plane({ at, length, width, z = 0, className, children }: { at: Point; length: number; width: number; z?: number; className?: string; children?: ReactNode }) {
  return <div className={`${styles.plane} ${className ?? ""}`} style={{ width: px(length), height: px(width), transform: toPx(at, z) }}>{children}</div>;
}

function subscribeToMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

const views = {
  angle: { yaw: 32, pitch: 58, label: "Three-quarter view" },
  side: { yaw: 0, pitch: 64, label: "Side view" },
  rear: { yaw: 90, pitch: 62, label: "From the rear door" },
  top: { yaw: 0, pitch: 0, label: "From above" },
};
type ViewId = keyof typeof views;

const stopColor: Record<number, string> = { 1: "#f51625", 2: "#fed603", 3: "#007dfe" };
const stepLabels = ["At the depot", ...loadStops.map(({ stop, shipment }) => `Stop ${stop} · ${places[shipments[shipment].to].name}`)];
const worldTransform = (zoom: number, pitch: number, yaw: number) => `scale(${zoom.toFixed(3)}) rotateX(${pitch.toFixed(1)}deg) rotateZ(${yaw.toFixed(1)}deg)`;

export function LoadPlan() {
  const [arrangement, setArrangement] = useState<ArrangementId>("initial");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState("KV-2041");
  const [view, setView] = useState<ViewId | null>("angle");
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const cargo = useRef<HTMLDivElement>(null);
  const camera = useRef({ yaw: views.angle.yaw, pitch: views.angle.pitch, zoom: 1 });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const itemElements = useRef(new Map<string, HTMLDivElement>());
  const running = useRef<Animation[]>([]);
  const previous = useRef({ arrangement, step });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const applyCamera = () => {
    const { yaw, pitch, zoom } = camera.current;
    if (world.current) world.current.style.transform = worldTransform(zoom, pitch, yaw);
  };

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      camera.current.zoom = Math.max(0.42, Math.min(1.05, entry.contentRect.width / 760));
      applyCamera();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { arrangement, step };
    running.current.forEach((animation) => animation.cancel());
    running.current = [];
    if (reducedMotion) return;
    if (before.arrangement !== arrangement) {
      // Fade faces, not the container: opacity on a preserve-3d parent flattens the scene.
      cargo.current?.querySelectorAll<HTMLElement>(`.${styles.pallet}:not([data-gone]) .${styles.face}`).forEach((face) => {
        running.current.push(face.animate([{ opacity: 0.1 }, { opacity: 1 }], { duration: 320, easing: "ease-out" }));
      });
      return;
    }
    if (step !== before.step + 1) return;
    for (const move of transitionMoves(arrangement, step).moves) {
      const element = itemElements.current.get(move.key);
      if (!element) continue;
      const travelShare = move.fade ? (move.duration - FADE_MS) / move.duration : 1;
      const total = pathLength(move.path) || 1;
      let covered = 0;
      const frames: Keyframe[] = move.path.map((point, index) => {
        if (index > 0) covered += Math.hypot(point.x - move.path[index - 1].x, point.y - move.path[index - 1].y);
        return { transform: toPx(point), offset: (covered / total) * travelShare, easing: "ease-in-out" };
      });
      if (move.fade) frames.push({ transform: toPx(move.path[move.path.length - 1]), offset: 1 });
      running.current.push(element.animate(frames, { duration: move.duration, delay: move.delay, fill: "backwards" }));
      if (move.fade) {
        element.querySelectorAll<HTMLElement>(`.${styles.face}`).forEach((face) => {
          running.current.push(face.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: travelShare }, { opacity: 0, offset: 1 }], { duration: move.duration, delay: move.delay, fill: "backwards" }));
        });
      }
    }
  }, [arrangement, step, reducedMotion]);

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
    timer.current = setTimeout(() => advance(1), 500);
  };

  const chooseStep = (next: number) => { stopPlaying(); setStep(next); };
  const chooseArrangement = (next: ArrangementId) => { stopPlaying(); setArrangement(next); };

  const setCamera = (id: ViewId) => {
    const from = world.current?.style.transform;
    camera.current = { ...camera.current, yaw: views[id].yaw, pitch: views[id].pitch };
    setView(id);
    applyCamera();
    if (!reducedMotion && from && world.current) {
      world.current.animate([{ transform: from }, { transform: world.current.style.transform }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragged.current = false;
    drag.current = { x: event.clientX, y: event.clientY, yaw: camera.current.yaw, pitch: camera.current.pitch, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    if (!start.moved) {
      start.moved = true;
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setView(null);
    }
    camera.current.yaw = start.yaw + dx * 0.35;
    if (event.pointerType !== "touch") camera.current.pitch = Math.max(0, Math.min(76, start.pitch - dy * 0.3));
    applyCamera();
  };
  const onPointerEnd = () => { drag.current = null; };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const turns: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] };
    const turn = turns[event.key];
    if (!turn) return;
    event.preventDefault();
    camera.current.yaw += turn[0];
    camera.current.pitch = Math.max(0, Math.min(76, camera.current.pitch + turn[1]));
    setView(null);
    applyCamera();
  };
  const pick = (shipment: string) => { if (!dragged.current) setSelected(shipment); };

  const positions = placements(arrangement, step);
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
  const loadWeight = loadStops.reduce((sum, entry) => sum + totalWeight(shipments[entry.shipment]), 0);

  return (
    <Example
      title={`Vehicle B loading plan · ${operation.name} (fictional)`}
      note="Illustration only, not a certified loading plan."
      outcome={{
        start: <p><strong>Seven pallets for three stops,</strong> with their dimensions, weights, stacking rules, and delivery order, and Vehicle B&apos;s cargo space.</p>,
        finding: <p><strong>The first delivery is loaded behind later deliveries.</strong> The proposed arrangement keeps it by the door: <strong>a loading sequence to review.</strong></p>,
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
          <div
            ref={viewport}
            className={styles.viewport}
            role="group"
            aria-roledescription="3D cargo view"
            aria-label={`Vehicle B's cargo space, ${arrangement} arrangement. Drag or use the arrow keys to rotate.`}
            aria-describedby="load-caption"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
          >
            <div ref={world} className={styles.world} style={{ transform: worldTransform(1, views.angle.pitch, views.angle.yaw) }}>
              <Plane at={{ x: -2.6, y: -2.3 }} length={15.4} width={6.4} z={-0.03} className={styles.ground} />
              <Plane at={{ x: CARGO.length + 1.4, y: 0.05 }} length={4.1} width={2.35} z={-0.02} className={styles.stagingZone}><span>Space behind the truck</span></Plane>
              <Plane at={{ x: 0, y: 0 }} length={CARGO.length} width={CARGO.width} className={styles.floor}>
                {Array.from({ length: ROWS * 2 }, (_, index) => {
                  const lane = (index % 2) as Lane;
                  return <span key={index} className={styles.floorSlot} style={{ left: px(rowX(Math.floor(index / 2))), top: px(laneY[lane]), width: px(1.2), height: px(1) }} />;
                })}
              </Plane>
              <div className={styles.anchor} style={{ transform: toPx({ x: 0, y: 0 }) }}>
                <div className={`${styles.wall} ${styles.wallBulkhead}`} style={{ width: px(CARGO.height), height: px(CARGO.width) }} />
                <div className={`${styles.wall} ${styles.wallSide}`} style={{ width: px(CARGO.length), height: px(CARGO.height) }} />
                <div className={`${styles.wall} ${styles.wallSide}`} style={{ width: px(CARGO.length), height: px(CARGO.height), transform: `translateY(${px(CARGO.width)}px) rotateX(90deg)` }} />
                <div className={`${styles.wall} ${styles.door}`} style={{ width: px(CARGO.height), height: px(CARGO.width), transform: `translateX(${px(CARGO.length)}px) rotateY(-90deg)` }} />
              </div>
              <div className={styles.anchor} style={{ transform: toPx({ x: -1.75, y: 0.1 }) }}>
                <Box length={1.6} width={2.25} height={2.6} className={styles.cab} top={<span>Cab</span>} />
              </div>
              <Plane at={{ x: CARGO.length - 1.2, y: CARGO.width + 0.25 }} length={1.6} width={0.5} className={styles.groundLabel}><span>Rear door</span></Plane>
              <Plane at={{ x: 0, y: CARGO.width + 0.25 }} length={2.4} width={0.5} className={styles.groundLabel}><span>Front of the load</span></Plane>
              <div ref={cargo} className={styles.cargo}>
                {items.map((item) => {
                  const position = positions[item.key];
                  const shipment = shipments[item.shipment];
                  return (
                    <div
                      key={item.key}
                      ref={(element) => { if (element) itemElements.current.set(item.key, element); else itemElements.current.delete(item.key); }}
                      className={styles.pallet}
                      data-gone={position.gone || undefined}
                      data-selected={selected === item.shipment || undefined}
                      style={{ transform: toPx(position), "--c": stopColor[item.stop], "--t": item.stop === 2 ? "#17191a" : "#fff" } as CSSProperties}
                      onClick={() => pick(item.shipment)}
                    >
                      <Box length={shipment.pallet.length} width={shipment.pallet.width} height={PALLET_BASE} className={styles.palletBase} />
                      <Box length={shipment.pallet.length} width={shipment.pallet.width} height={shipment.pallet.height - PALLET_BASE} z={PALLET_BASE} className={styles.palletLoad} top={<span>{item.shipment}<i>Stop {item.stop}</i></span>} />
                    </div>
                  );
                })}
              </div>
            </div>
            <p className={styles.sceneHint} aria-hidden="true">Drag to rotate</p>
            <ul className={styles.sceneLegend} aria-label="Pallet colours">
              {loadStops.map(({ stop }) => <li key={stop} style={{ "--c": stopColor[stop] } as CSSProperties}>Stop {stop}</li>)}
            </ul>
          </div>
          <div role="group" aria-label="Camera" className={styles.cameraButtons}>
            {(Object.keys(views) as ViewId[]).map((id) => (
              <button key={id} type="button" aria-pressed={view === id} onClick={() => setCamera(id)}>{views[id].label}</button>
            ))}
          </div>
          <div className={styles.sequence}>
            <div role="group" aria-label="Delivery sequence" className={styles.stepButtons}>
              {stepLabels.map((label, index) => (
                <button key={label} type="button" aria-pressed={step === index} onClick={() => chooseStep(index)}>
                  <span className={styles.stepDot} style={{ "--c": index === 0 ? "#17191a" : stopColor[index] } as CSSProperties} />
                  {label}
                </button>
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
                <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)} style={{ "--c": stopColor[stop] } as CSSProperties}>
                  <span className={styles.manifestId}>{id}<span>Stop {stop} · {places[shipments[id].to].name}</span></span>
                  <span className={styles.manifestCount}>{shipments[id].pallets} pallets</span>
                </button>
              ))}
            </div>
            <dl className={styles.facts} aria-live="polite">
              <div><dt>Delivery stop</dt><dd>Stop {selectedStop}, {places[selectedShipment.to].name}, window {selectedShipment.deliveryWindow[0]}–{selectedShipment.deliveryWindow[1]}</dd></div>
              <div><dt>Dimensions</dt><dd>{formatSize(selectedShipment)} per pallet</dd></div>
              <div><dt>Weight</dt><dd>{formatKg(selectedShipment.pallet.weightKg)} per pallet, {formatKg(totalWeight(selectedShipment))} in total</dd></div>
              <div><dt>Can be stacked?</dt><dd>{selectedShipment.stackable}</dd></div>
              <div><dt>Position</dt><dd>Row {selectedRows.join(" and ")} of {ROWS}, counted from the front</dd></div>
              <div><dt>Reachable at its stop</dt><dd data-tone={selectedBlockers > 0 ? "alert" : "ok"}>{selectedBlockers > 0 ? `No. ${selectedBlockers} pallets for later stops are between it and the door.` : "Yes, without moving freight for later stops."}</dd></div>
            </dl>
          </div>
          <div className={styles.sheet}>
            <p className={styles.columnTitle}>Pallets for later stops moved first</p>
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
              Same freight in both: {items.length} pallets, {formatKg(loadWeight)}, {items.length} of {vehicles.B.palletSpaces} floor spaces, nothing stacked. Cargo space {CARGO.length} × {CARGO.width} × {CARGO.height} m, rear door with tail-lift.
            </p>
            <p className={styles.sameCargo}>
              Only KV-2042 may be stacked and the plan does not need it, so every pallet can be moved with a pallet jack. KV-2046 is collected at stop 4, after this freight is off; the most Vehicle B carries at once is {plans.requestOnB.maxOnBoard} pallets.
            </p>
          </div>
        </div>
      </div>
    </Example>
  );
}
