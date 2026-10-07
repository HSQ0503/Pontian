"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Check, CircleAlert, Clock3 } from "lucide-react";
import styles from "./logistics.module.css";
import {
  collectionDetourKm,
  driverRule,
  formatKg,
  formatMoney,
  formatSize,
  operation,
  places,
  plans,
  quoteLines,
  quoteRequest,
  quoteTotal,
  rateCard,
  roadKm,
  routeAssumptions,
  serviceRule,
  shipments,
  stopOf,
  totalWeight,
  vehicles,
  type PlaceId,
  type PlannedRoute,
  type VehicleId,
} from "./logistics-data";

type Outcome = { start: ReactNode; finding: ReactNode; next: ReactNode };

export function Example({ title, note, children, outcome }: { title: string; note: string; children: ReactNode; outcome: Outcome }) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.exampleNote}>{note}</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="start"><span className={styles.outcomeLabel}>What the team starts with</span>{outcome.start}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>What the system helps work out</span>{outcome.finding}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>What someone reviews or does next</span>{outcome.next}</li>
      </ol>
    </figure>
  );
}

export function Choice<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string; detail?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className={styles.choice}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          <span>{option.label}</span>
          {option.detail && <span className={styles.choiceDetail}>{option.detail}</span>}
        </button>
      ))}
    </div>
  );
}

const minutesBetween = (from: string, to: string) => {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return th * 60 + tm - (fh * 60 + fm);
};

function StopList({ route, isNew, moved, selected, onSelect, compact = false }: {
  route: PlannedRoute;
  isNew?: (shipment: string) => boolean;
  moved?: (shipment: string) => boolean;
  selected?: string | null;
  onSelect?: (shipment: string) => void;
  compact?: boolean;
}) {
  const vehicle = vehicles[route.vehicle];
  return (
    <ol className={`${styles.stops} ${compact ? styles.stopsCompact : ""}`}>
      <li className={styles.stopEdge}>
        <span className={styles.stopTime}>{vehicle.departs}</span>
        <span>Leaves {places.depot.name} with {route.loadedAtDepot} of {vehicle.palletSpaces} pallet spaces used</span>
      </li>
      {route.stops.map((stop, index) => {
        const shipment = shipments[stop.shipment];
        const wait = minutesBetween(stop.arrive, stop.start);
        const content = (
          <>
            <span className={styles.stopNumber} data-vehicle={route.vehicle}>{index + 1}</span>
            <span className={styles.stopMain}>
              <span className={styles.stopPlace}>{places[stop.place].name}</span>
              <span className={styles.stopTask}>{stop.action === "collect" ? "Collect" : "Deliver"} {stop.shipment} · {shipment.pallets} pallets</span>
              <span className={styles.stopTiming}>
                Arrives {stop.arrive}{wait > 0 ? `, starts ${stop.start}` : ""} · window {stop.window[0]}–{stop.window[1]}
              </span>
              {route.driverBreak?.stopIndex === index && (
                <span className={styles.stopBreak}>
                  Driver break {route.driverBreak.start}–{route.driverBreak.end}{route.driverBreak.during === "wait" ? ", while waiting for the window" : ", after this stop"}
                </span>
              )}
            </span>
            <span className={styles.stopStatus}>
              {stop.late ? <span className={styles.tag} data-tone="alert">Misses window</span> : <span className={styles.tag} data-tone="ok">In window</span>}
              {moved?.(stop.shipment) ? <span className={styles.tag} data-tone="flag">Moved from A</span> : isNew?.(stop.shipment) ? <span className={styles.tag} data-tone="flag">New</span> : null}
            </span>
          </>
        );
        return (
          <li key={`${stop.shipment}-${stop.action}`} data-late={stop.late || undefined} data-new={isNew?.(stop.shipment) || moved?.(stop.shipment) || undefined}>
            {onSelect ? (
              <button type="button" className={styles.stopButton} aria-pressed={selected === stop.shipment} onClick={() => onSelect(stop.shipment)}>{content}</button>
            ) : <div className={styles.stopButton}>{content}</div>}
          </li>
        );
      })}
      <li className={styles.stopEdge} data-late={route.overShift || undefined}>
        <span className={styles.stopTime}>{route.returnsAt}</span>
        <span>Back at the depot · driver available until {vehicle.driver[1]}</span>
      </li>
    </ol>
  );
}

const mapX = (x: number) => 30 + x * 10;
const mapY = (y: number) => 30 + y * 10;

const routePlaces = (route: PlannedRoute): PlaceId[] => ["depot", ...route.stops.map((stop) => stop.place), "depot"];
const legsOf = (route: PlannedRoute) => routePlaces(route).slice(1).map((place, index) => [routePlaces(route)[index], place] as [PlaceId, PlaceId]);
const legKey = ([a, b]: [PlaceId, PlaceId]) => `${a}>${b}`;

function RouteMap({ routes, baseRoutes, showRequest, selected, onSelect, focus }: {
  routes: Record<VehicleId, PlannedRoute>;
  baseRoutes: Record<VehicleId, PlannedRoute>;
  showRequest: boolean;
  selected: string | null;
  onSelect: (shipment: string) => void;
  focus: VehicleId;
}) {
  const selectedPlaces: PlaceId[] = selected ? [shipments[selected].from, shipments[selected].to].filter((place) => place !== "depot") : [];
  const order: VehicleId[] = focus === "A" ? ["B", "A"] : ["A", "B"];
  return (
    <svg viewBox="0 0 760 500" className={styles.map} role="img" aria-label={`Schematic map of ${operation.name}'s area showing the depot, delivery locations, and the order each vehicle visits them.`}>
      <defs>
        <pattern id="logistics-map-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e4e4e2" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="760" height="500" fill="url(#logistics-map-grid)" />
      {order.map((vehicleId) => {
        const route = routes[vehicleId];
        const baseKeys = new Set(legsOf(baseRoutes[vehicleId]).map(legKey));
        const currentKeys = new Set(legsOf(route).map(legKey));
        const removed = legsOf(baseRoutes[vehicleId]).filter((leg) => !currentKeys.has(legKey(leg)));
        return (
          <g key={vehicleId} className={styles.mapRoute} data-vehicle={vehicleId} data-focus={focus === vehicleId || undefined}>
            {removed.map(([a, b]) => (
              <line key={`removed-${a}-${b}`} className={styles.mapLegRemoved} x1={mapX(places[a].x)} y1={mapY(places[a].y)} x2={mapX(places[b].x)} y2={mapY(places[b].y)} />
            ))}
            {legsOf(route).map(([a, b]) => {
              const changed = !baseKeys.has(legKey([a, b]));
              return (
                <g key={`${a}-${b}`}>
                  {changed && <line className={styles.mapLegChanged} x1={mapX(places[a].x)} y1={mapY(places[a].y)} x2={mapX(places[b].x)} y2={mapY(places[b].y)} />}
                  <line className={styles.mapLeg} data-changed={changed || undefined} x1={mapX(places[a].x)} y1={mapY(places[a].y)} x2={mapX(places[b].x)} y2={mapY(places[b].y)} />
                </g>
              );
            })}
          </g>
        );
      })}
      {(["A", "B"] as VehicleId[]).flatMap((vehicleId) =>
        routes[vehicleId].stops.map((stop, index) => {
          const place = places[stop.place];
          const isSelected = selectedPlaces.includes(stop.place);
          return (
            <g key={`${vehicleId}-${stop.place}`} className={styles.mapStop} data-vehicle={vehicleId} data-late={stop.late || undefined} data-selected={isSelected || undefined} onClick={() => onSelect(stop.shipment)} aria-hidden="true">
              {isSelected && <circle className={styles.mapHalo} cx={mapX(place.x)} cy={mapY(place.y)} r="22" />}
              <circle className={styles.mapMarker} cx={mapX(place.x)} cy={mapY(place.y)} r="13" />
              <text className={styles.mapNumber} x={mapX(place.x)} y={mapY(place.y) + 4.5} textAnchor="middle">{index + 1}</text>
              <text className={styles.mapLabel} x={mapX(place.x) + place.label.dx} y={mapY(place.y) + place.label.dy} textAnchor={place.label.anchor}>{place.name}</text>
            </g>
          );
        }),
      )}
      {!showRequest && (["glenway", "hollin"] as PlaceId[]).map((id) => (
        <g key={id} className={styles.mapPending} aria-hidden="true">
          <circle cx={mapX(places[id].x)} cy={mapY(places[id].y)} r="7" />
        </g>
      ))}
      <g className={styles.mapDepot} aria-hidden="true">
        <rect x={mapX(places.depot.x) - 12} y={mapY(places.depot.y) - 12} width="24" height="24" />
        <text className={styles.mapLabel} x={mapX(places.depot.x) + places.depot.label.dx} y={mapY(places.depot.y) + places.depot.label.dy} textAnchor="end">{places.depot.name}</text>
      </g>
      <g className={styles.mapScale} aria-hidden="true">
        <line x1="30" y1="476" x2="130" y2="476" />
        <text x="30" y="466">10 km, straight line</text>
      </g>
    </svg>
  );
}

type DispatchView = "plan" | "A" | "B";

const viewRoutes: Record<DispatchView, Record<VehicleId, PlannedRoute>> = {
  plan: { A: plans.baseA, B: plans.baseB },
  A: { A: plans.requestOnA, B: plans.baseB },
  B: { A: plans.baseA, B: plans.requestOnB },
};

function ShipmentDetail({ id, routes }: { id: string; routes: Record<VehicleId, PlannedRoute> }) {
  const shipment = shipments[id];
  const vehicleId = (["A", "B"] as VehicleId[]).find((vehicle) => routes[vehicle].stops.some((stop) => stop.shipment === id));
  const route = vehicleId ? routes[vehicleId] : undefined;
  const stopNumbers = route ? route.stops.flatMap((stop, index) => (stop.shipment === id ? [index + 1] : [])) : [];
  return (
    <div className={styles.detailCard} aria-live="polite">
      <p className={styles.detailTitle}>{id}{shipment.isNew && <span className={styles.tag} data-tone="flag">New pickup request</span>}</p>
      <dl className={styles.facts}>
        {shipment.collectionWindow && <div><dt>Collect from</dt><dd>{places[shipment.from].name}, {shipment.collectionWindow[0]}–{shipment.collectionWindow[1]}</dd></div>}
        <div><dt>Customer delivery window</dt><dd>{places[shipment.to].name}, {shipment.deliveryWindow[0]}–{shipment.deliveryWindow[1]}</dd></div>
        <div><dt>Space required</dt><dd>{shipment.pallets} pallet spaces · {formatSize(shipment)} each · {formatKg(totalWeight(shipment))}</dd></div>
        <div><dt>Assigned to</dt><dd>{vehicleId ? `${vehicles[vehicleId].name}, ${stopNumbers.length > 1 ? "stops" : "stop"} ${stopNumbers.join(" and ")}` : "Not yet assigned"}</dd></div>
      </dl>
    </div>
  );
}

function VehicleFacts({ id, route }: { id: VehicleId; route: PlannedRoute }) {
  const vehicle = vehicles[id];
  return (
    <dl className={styles.vehicleFacts}>
      <div><dt>Vehicle capacity</dt><dd>{vehicle.palletSpaces} pallet spaces, {formatKg(vehicle.payloadKg)}</dd></div>
      <div><dt>Driver availability</dt><dd>{vehicle.driver[0]}–{vehicle.driver[1]}</dd></div>
      <div><dt>Most on board</dt><dd>{route.maxOnBoard} of {vehicle.palletSpaces} spaces</dd></div>
    </dl>
  );
}

export function DeliveryPlan() {
  const [view, setView] = useState<DispatchView>("B");
  const [vehicle, setVehicle] = useState<VehicleId>("B");
  const [selected, setSelected] = useState<string | null>("KV-2046");
  const routes = viewRoutes[view];
  const request = shipments["KV-2046"];
  const late = plans.requestOnA.lateStops[0];
  const lateBy = minutesBetween(late.window[1], late.arrive);
  const missedCollection = stopOf(plans.requestOnAAfterFairholt, "KV-2046", "collect");
  const collectOnB = stopOf(plans.requestOnB, "KV-2046", "collect");
  const deliverOnB = stopOf(plans.requestOnB, "KV-2046");
  const choose = (next: DispatchView) => {
    setView(next);
    if (next !== "plan") setVehicle(next);
  };
  const options = [
    {
      id: "A" as const,
      verdict: "Conflicts with an existing delivery window.",
      tone: "alert",
      detail: `Collecting first sends ${late.shipment} to ${places[late.place].name} at ${late.arrive}, ${lateBy} minutes after its window closes. Collecting after ${places[late.place].name} reaches ${places.glenway.name} at ${missedCollection?.arrive}, after the ${request.collectionWindow?.[1]} collection cutoff.`,
    },
    {
      id: "B" as const,
      verdict: "Fits the example schedule and available capacity.",
      tone: "ok",
      detail: `After its three deliveries, Vehicle B collects at ${collectOnB?.arrive} and delivers at ${deliverOnB?.start}. Its existing stops keep their times, and it is back at ${plans.requestOnB.returnsAt}.`,
    },
  ];
  return (
    <Example
      title={`Tomorrow's deliveries · ${operation.name} (fictional)`}
      note="Schematic map. Drive times are example values."
      outcome={{
        start: <p><strong>Tomorrow&apos;s deliveries</strong> on two vehicles, then a new pickup request: {request.pallets} pallets from {places.glenway.name} to {places.hollin.name}.</p>,
        finding: <p><strong>Vehicle A</strong> conflicts with an existing delivery window. <strong>Vehicle B</strong> fits the example schedule and available capacity. <strong>Proposed assignment: Vehicle B.</strong></p>,
        next: <p><strong>Dispatcher reviews the updated route</strong> before anything is sent to the driver.</p>,
      }}
    >
      <div className={styles.requestStrip} data-active={view !== "plan" || undefined}>
        <span className={styles.requestLead}>{view === "plan" ? "Next: a new pickup request arrives" : "A new pickup request arrives"}</span>
        <span><strong>KV-2046</strong> · collect {request.pallets} pallets at {places.glenway.name}, {request.collectionWindow?.[0]}–{request.collectionWindow?.[1]}</span>
        <span>deliver to {places.hollin.name}, {request.deliveryWindow[0]}–{request.deliveryWindow[1]}</span>
        <span>{formatSize(request)} each, {formatKg(totalWeight(request))}</span>
      </div>
      <div className={styles.dispatchGrid}>
        <div className={styles.mapSheet}>
          <div className={styles.sheetHead}>
            <Choice
              label="Plan to show"
              value={view}
              onChange={choose}
              options={[
                { value: "plan", label: "Tomorrow's deliveries" },
                { value: "A", label: "Try Vehicle A" },
                { value: "B", label: "Try Vehicle B" },
              ]}
            />
          </div>
          <RouteMap routes={routes} baseRoutes={viewRoutes.plan} showRequest={view !== "plan"} selected={selected} onSelect={setSelected} focus={vehicle} />
          <ul className={styles.mapLegend} aria-label="Map key">
            <li data-key="A">Vehicle A</li>
            <li data-key="B">Vehicle B</li>
            <li data-key="changed">Changed by the new request</li>
            <li data-key="removed">Leg it replaces</li>
            <li data-key="late">Misses a window</li>
          </ul>
          <div className={styles.shipmentPicker} role="group" aria-label="Select a shipment">
            {Object.values(shipments).map((shipment) => (
              <button key={shipment.id} type="button" aria-pressed={selected === shipment.id} onClick={() => setSelected(shipment.id)}>
                {shipment.id}<span>{places[shipment.to].name}</span>
              </button>
            ))}
          </div>
          {selected && <ShipmentDetail id={selected} routes={routes} />}
        </div>
        <div className={styles.dispatchSide}>
          <div className={styles.compare} role="group" aria-label="Compare two possible assignments for KV-2046">
            {options.map((option) => (
              <button key={option.id} type="button" className={styles.compareCard} data-tone={option.tone} aria-pressed={view === option.id} onClick={() => choose(option.id)}>
                <span className={styles.compareName}>{vehicles[option.id].name}</span>
                <span className={styles.compareVerdict}>
                  {option.tone === "ok" ? <Check size={15} aria-hidden="true" /> : <CircleAlert size={15} aria-hidden="true" />}
                  {option.verdict}
                </span>
                <span className={styles.compareDetail}>{option.detail}</span>
              </button>
            ))}
          </div>
          <p className={styles.proposed}><span>Proposed assignment</span>Vehicle B</p>
          <div className={styles.sheet}>
            <div className={styles.sheetHead}>
              <Choice label="Show stops for" value={vehicle} onChange={setVehicle} options={[{ value: "A", label: "Vehicle A stops" }, { value: "B", label: "Vehicle B stops" }]} />
            </div>
            <VehicleFacts id={vehicle} route={routes[vehicle]} />
            <StopList route={routes[vehicle]} isNew={(id) => id === "KV-2046"} selected={selected} onSelect={setSelected} />
          </div>
          <p className={styles.rules}><Clock3 size={13} aria-hidden="true" /> Example rules: {serviceRule} {driverRule} {routeAssumptions}</p>
        </div>
      </div>
    </Example>
  );
}

type RecoveryMode = "original" | "recovery";
type RecoveryOption = "KV-2044" | "KV-2045";

export function DisruptionRecovery() {
  const [mode, setMode] = useState<RecoveryMode>("recovery");
  const [option, setOption] = useState<RecoveryOption>("KV-2044");
  const [draft, setDraft] = useState(false);
  const vehicleB = vehicles.B;
  const freeAtDeparture = vehicleB.palletSpaces - plans.requestOnB.loadedAtDepot;
  const moved = stopOf(plans.recoveryB, "KV-2044");
  const movedIndex = plans.recoveryB.stops.findIndex((stop) => stop.shipment === "KV-2044");
  const before = plans.recoveryB.stops[movedIndex - 1];
  const keepsTimes = plans.requestOnB.stops.every((stop) => stopOf(plans.recoveryB, stop.shipment, stop.action)?.start === stop.start);
  const fairholt = shipments["KV-2045"];
  const firstLate = plans.fairholtFirstOnB.lateStops[0];
  const explanations: Record<RecoveryOption, { status: string; tone: string; rows: [string, string][] }> = {
    "KV-2044": {
      status: "Delivery 1 can be reassigned.",
      tone: "ok",
      rows: [
        ["Which shipment moves", `KV-2044, ${shipments["KV-2044"].pallets} pallets for ${places.elm.name}`],
        ["Which vehicle takes it", `Vehicle B, as stop ${movedIndex + 1}, after ${places[before.place].name}`],
        ["Does the window still fit", `Yes. It arrives at ${moved?.arrive}; the window is ${moved?.window[0]}–${moved?.window[1]}.`],
        ["Effect on Vehicle B", `${plans.recoveryB.loadedAtDepot} of ${vehicleB.palletSpaces} spaces and ${formatKg(plans.recoveryB.weightAtDepot)} of ${formatKg(vehicleB.payloadKg)} at departure. ${keepsTimes ? "Its other stops keep their times" : "Some stop times change"}, and it is back at ${plans.recoveryB.returnsAt}.`],
        ["What remains unresolved", "KV-2045 still needs a vehicle."],
      ],
    },
    "KV-2045": {
      status: "Delivery 2 still needs another option.",
      tone: "alert",
      rows: [
        ["Which shipment moves", `KV-2045, ${fairholt.pallets} pallets for ${places.fairholt.name}`],
        ["Which vehicle takes it", `Not Vehicle B. It needs ${fairholt.pallets} pallet spaces; Vehicle B has ${freeAtDeparture} free at departure, and ${vehicleB.palletSpaces - plans.recoveryB.loadedAtDepot} after taking Delivery 1.`],
        ["Does the window still fit", `No. ${places.fairholt.name} is ${fairholt.deliveryWindow[0]}–${fairholt.deliveryWindow[1]}, while Vehicle B is on its eastern stops. Going there first would bring ${firstLate.shipment} to ${places[firstLate.place].name} at ${firstLate.arrive}, after its ${firstLate.window[1]} window.`],
        ["What remains unresolved", "Dispatch needs another option, such as another vehicle or carrier, or a new window agreed with the customer."],
      ],
    },
  };
  const explanation = explanations[option];
  return (
    <Example
      title={`Vehicle A unavailable · ${operation.name} (fictional)`}
      note="Starts from a recorded vehicle-status update."
      outcome={{
        start: <p><strong>Vehicle A is unavailable before departure.</strong> Its two deliveries are affected, and Vehicle B has some remaining capacity.</p>,
        finding: <p><strong>A recovery plan with the remaining gap identified:</strong> Delivery 1 can be reassigned. Delivery 2 still needs another option.</p>,
        next: <p><strong>Dispatcher confirms the reassignment and reviews the unresolved delivery.</strong> If confirmed, Vehicle B&apos;s loading plan is revised before it leaves.</p>,
      }}
    >
      <div className={styles.statusUpdate}>
        <span className={styles.statusTime}>06:30</span>
        <span><strong>Vehicle-status update recorded by the workshop:</strong> Vehicle A is unavailable before departure.</span>
        <span className={styles.statusMeta}>Vehicle B leaves at {vehicleB.departs}</span>
      </div>
      <div className={styles.sheetHead}>
        <Choice
          label="Plan to show"
          value={mode}
          onChange={setMode}
          options={[{ value: "original", label: "Original plan" }, { value: "recovery", label: "Proposed partial recovery" }]}
        />
      </div>
      <div className={styles.recoveryGrid}>
        <div className={styles.sheet} data-unavailable="true">
          <p className={styles.laneTitle}>Vehicle A <span className={styles.tag} data-tone="alert">Unavailable</span></p>
          {mode === "original" ? (
            <ol className={styles.affected}>
              {plans.baseA.stops.map((stop, index) => (
                <li key={stop.shipment}>
                  <span className={styles.affectedName}>Delivery {index + 1} · {stop.shipment}</span>
                  <span>{places[stop.place].name} · {shipments[stop.shipment].pallets} pallets · window {stop.window[0]}–{stop.window[1]}</span>
                  <span className={styles.tag} data-tone="alert">Affected</span>
                </li>
              ))}
            </ol>
          ) : (
            <ol className={styles.affected}>
              <li data-resolved="true">
                <span className={styles.affectedName}>Delivery 1 · KV-2044</span>
                <span>Proposed for Vehicle B, stop {movedIndex + 1}</span>
                <span className={styles.tag} data-tone="ok">Reassigned</span>
              </li>
              <li>
                <span className={styles.affectedName}>Delivery 2 · KV-2045</span>
                <span>{places.fairholt.name} · {fairholt.pallets} pallets · window {fairholt.deliveryWindow[0]}–{fairholt.deliveryWindow[1]}</span>
                <span className={styles.tag} data-tone="alert">Unresolved</span>
              </li>
            </ol>
          )}
          <p className={styles.capacityNote}>
            Vehicle B has some remaining capacity: {freeAtDeparture} of {vehicleB.palletSpaces} pallet spaces free at departure, before any reassignment.
          </p>
        </div>
        <div className={styles.sheet}>
          <p className={styles.laneTitle}>Vehicle B <span className={styles.laneMeta}>{mode === "original" ? "Original plan" : "With Delivery 1 added"}</span></p>
          <StopList route={mode === "original" ? plans.requestOnB : plans.recoveryB} moved={(id) => mode === "recovery" && id === "KV-2044"} compact />
        </div>
        <div className={styles.options}>
          <p className={styles.optionsTitle}>Recovery options</p>
          <div role="group" aria-label="Select a recovery option" className={styles.optionList}>
            {(Object.keys(explanations) as RecoveryOption[]).map((id, index) => (
              <button key={id} type="button" aria-pressed={option === id} data-tone={explanations[id].tone} onClick={() => setOption(id)}>
                <span>Delivery {index + 1} · {id} to Vehicle B</span>
                <span className={styles.tag} data-tone={explanations[id].tone}>{explanations[id].tone === "ok" ? "Can be reassigned" : "Needs another option"}</span>
              </button>
            ))}
          </div>
          <div className={styles.optionDetail} aria-live="polite">
            <p className={styles.optionStatus} data-tone={explanation.tone}>{explanation.status}</p>
            <dl className={styles.facts}>
              {explanation.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </div>
          <button type="button" className={styles.draftToggle} aria-expanded={draft} onClick={() => setDraft(!draft)}>
            {draft ? "Hide customer update" : "Preview customer update"} <ArrowRight size={14} aria-hidden="true" />
          </button>
          {draft && (
            <div className={styles.draft}>
              <p className={styles.draftLabel}>Draft update — awaiting approval</p>
              <p className={styles.draftTo}>To the customer for KV-2045, {places.fairholt.name}</p>
              <p className={styles.draftText}>Your delivery schedule is being revised. We will confirm the updated arrival window.</p>
              <p className={styles.draftMeta}>Not sent. Dispatch edits or approves it first.</p>
            </div>
          )}
        </div>
      </div>
    </Example>
  );
}

type QuoteStage = 1 | 2 | 3;
type FieldKey = "pickup" | "delivery" | "timing" | "cargo" | "dimensions" | "handling";
type LineKey = "base" | "detour" | "handling" | "availability";

const requestText: { text: string; field?: FieldKey }[] = [
  { text: "Hi, can you collect " },
  { text: "two pallets", field: "cargo" },
  { text: " " },
  { text: "tomorrow morning", field: "timing" },
  { text: " and deliver them " },
  { text: "that afternoon", field: "timing" },
  { text: "? They're at " },
  { text: "Glenway Works, Unit 4", field: "pickup" },
  { text: ", going to " },
  { text: "Hollin Yard, Gate 2", field: "delivery" },
  { text: "." },
];

const replyText: { text: string; field?: FieldKey }[] = [
  { text: "Each pallet is " },
  { text: "1.2 × 1.0 m and 1.4 m high, about 380 kg", field: "dimensions" },
  { text: ". They " },
  { text: "can't be stacked", field: "dimensions" },
  { text: ", and there's " },
  { text: "no forklift at Hollin Yard", field: "handling" },
  { text: "." },
];

function Message({ parts, field }: { parts: { text: string; field?: FieldKey }[]; field: FieldKey | null }) {
  return (
    <p className={styles.messageText}>
      {parts.map((part, index) => part.field ? <mark key={index} data-active={part.field === field || undefined}>{part.text}</mark> : <span key={index}>{part.text}</span>)}
    </p>
  );
}

export function QuotePreparation() {
  const [stage, setStage] = useState<QuoteStage>(3);
  const [field, setField] = useState<FieldKey | null>("dimensions");
  const [line, setLine] = useState<LineKey>("detour");
  const shipment = shipments["KV-2046"];
  const confirmed = stage >= 2;
  const fields: { key: FieldKey; label: string; value: string; missing?: boolean; source: string }[] = [
    { key: "pickup", label: "Pickup", value: places.glenway.name + ", Unit 4", source: "Request" },
    { key: "delivery", label: "Delivery", value: places.hollin.name + ", Gate 2", source: "Request" },
    { key: "timing", label: "Requested timing", value: `Collect tomorrow ${shipment.collectionWindow?.[0]}–${shipment.collectionWindow?.[1]}, deliver ${shipment.deliveryWindow[0]}–${shipment.deliveryWindow[1]}`, source: "Request, read as the standard morning and afternoon windows" },
    { key: "cargo", label: "Cargo", value: `${shipment.pallets} pallets`, source: "Request" },
    confirmed
      ? { key: "dimensions", label: "Dimensions", value: `${formatSize(shipment)} each, ${shipment.pallet.weightKg} kg each, not stackable`, source: `Customer reply, ${quoteRequest.replyReceived.toLowerCase()}` }
      : { key: "dimensions", label: "Dimensions", value: "Confirmation needed", missing: true, source: "Not stated in the request" },
    ...(confirmed ? [{ key: "handling" as const, label: "Handling", value: "Tail-lift delivery, no forklift on site", source: "Customer reply" }] : []),
  ];
  const lines: { key: LineKey; label: string; amount: string; rule: string; input: string; working: string }[] = [
    { key: "base", label: "Base transport charge", amount: formatMoney(quoteLines.base), rule: `Example rate card, ${rateCard.zone} pallet rate: ${formatMoney(rateCard.palletRate)} per standard pallet (${rateCard.standardPallet}).`, input: `${shipment.pallets} pallets confirmed at ${formatSize(shipment)} and ${shipment.pallet.weightKg} kg each, so the standard rate applies. ${places.hollin.name} is in ${rateCard.zone}.`, working: `${shipment.pallets} × ${formatMoney(rateCard.palletRate)} = ${formatMoney(quoteLines.base)}` },
    { key: "detour", label: "Additional pickup distance", amount: formatMoney(quoteLines.detour), rule: `Collections away from the depot: ${formatMoney(rateCard.perExtraKm)} per additional km, compared with a direct run from the depot to the customer.`, input: `Depot to ${places.glenway.name} ${roadKm("depot", "glenway")} km, then to ${places.hollin.name} ${roadKm("glenway", "hollin")} km, against ${roadKm("depot", "hollin")} km direct.`, working: `${collectionDetourKm} km × ${formatMoney(rateCard.perExtraKm)} = ${formatMoney(quoteLines.detour)}` },
    { key: "handling", label: "Required handling", amount: formatMoney(quoteLines.handling), rule: `Tail-lift delivery: ${formatMoney(rateCard.tailLiftPerStop)} per stop.`, input: "The customer's reply says there is no forklift at Hollin Yard.", working: `1 stop × ${formatMoney(rateCard.tailLiftPerStop)} = ${formatMoney(quoteLines.handling)}` },
    { key: "availability", label: "Availability check", amount: "No charge", rule: "Quote only against capacity in tomorrow's plan. Dispatch confirms the vehicle before the quote is sent.", input: "Tomorrow's plan has room for two pallets after Vehicle B's morning deliveries.", working: "Space appears available. Vehicle to be confirmed in dispatch." },
  ];
  const activeLine = lines.find((item) => item.key === line) ?? lines[0];
  const stages: { value: QuoteStage; label: string }[] = [
    { value: 1, label: "Request received" },
    { value: 2, label: "Dimensions confirmed" },
    { value: 3, label: "Draft quote prepared" },
  ];
  return (
    <Example
      title={`Request ${quoteRequest.reference} · ${operation.name} (fictional)`}
      note="Example rate card, not market rates."
      outcome={{
        start: <p><strong>A short, unstructured request</strong> with the pickup, delivery, and timing, but no pallet dimensions.</p>,
        finding: <p><strong>Confirm dimensions before selecting a vehicle.</strong> Once they are supplied: a draft quote with its assumptions.</p>,
        next: <p><strong>Commercial team reviews the price before sending.</strong> Nothing goes to the customer automatically.</p>,
      }}
    >
      <div className={styles.quoteHead}>
        <ol className={styles.flow} aria-label="How the request is worked through">
          <li>Unstructured request</li>
          <li>Confirmed shipment details</li>
          <li>Pricing inputs</li>
          <li>Draft quote</li>
        </ol>
        <Choice label="Step through the example" value={String(stage) as "1" | "2" | "3"} onChange={(value) => setStage(Number(value) as QuoteStage)} options={stages.map((item) => ({ value: String(item.value) as "1" | "2" | "3", label: `${item.value} · ${item.label}` }))} />
      </div>
      <div className={styles.quoteGrid}>
        <div className={styles.sheet}>
          <p className={styles.columnTitle}>Incoming request</p>
          <div className={styles.message}>
            <p className={styles.messageMeta}>{quoteRequest.from} · {quoteRequest.received}</p>
            <Message parts={requestText} field={field} />
          </div>
          {confirmed ? (
            <div className={styles.message} data-reply="true">
              <p className={styles.messageMeta}>Reply · {quoteRequest.replyReceived}</p>
              <Message parts={replyText} field={field} />
            </div>
          ) : (
            <button type="button" className={styles.supply} onClick={() => setStage(2)}>Add the customer&apos;s reply <ArrowRight size={14} aria-hidden="true" /></button>
          )}
        </div>
        <div className={styles.sheet}>
          <p className={styles.columnTitle}>Shipment record <span className={styles.laneMeta}>{quoteRequest.reference}</span></p>
          <div role="group" aria-label="Select an extracted field to see where it came from" className={styles.fields}>
            {fields.map((item) => (
              <button key={item.key} type="button" aria-pressed={field === item.key} data-missing={item.missing || undefined} onClick={() => setField(item.key)}>
                <span className={styles.fieldLabel}>{item.label}</span>
                <span className={styles.fieldValue}>{item.value}</span>
                <span className={styles.fieldSource}>{item.source}</span>
              </button>
            ))}
          </div>
          <p className={styles.finding} data-resolved={confirmed || undefined}>
            {confirmed ? <Check size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}
            {confirmed ? "Dimensions confirmed before selecting a vehicle." : "Confirm dimensions before selecting a vehicle."}
          </p>
        </div>
        <div className={styles.sheet}>
          <p className={styles.columnTitle}>Pricing inputs</p>
          {confirmed ? (
            <>
              <div role="group" aria-label="Select a pricing component to see the rule and input it uses" className={styles.lines}>
                {lines.map((item) => (
                  <button key={item.key} type="button" aria-pressed={line === item.key} onClick={() => setLine(item.key)}>
                    <span>{item.label}</span>
                    <span className={styles.lineAmount}>{item.amount}</span>
                  </button>
                ))}
              </div>
              <dl className={styles.lineDetail} aria-live="polite">
                <div><dt>Approved rule</dt><dd>{activeLine.rule}</dd></div>
                <div><dt>Supplied input</dt><dd>{activeLine.input}</dd></div>
                <div><dt>Working</dt><dd>{activeLine.working}</dd></div>
              </dl>
              {line === "detour" && <p className={styles.consideration}>This pickup adds travel before the vehicle reaches the customer.</p>}
            </>
          ) : (
            <p className={styles.onHold}>On hold. The pallet size decides which rate applies and which vehicle can take it.</p>
          )}
        </div>
        <div className={styles.sheet}>
          <p className={styles.columnTitle}>Draft quote</p>
          {stage === 3 ? (
            <div className={styles.quote}>
              <table>
                <tbody>
                  {lines.slice(0, 3).map((item) => <tr key={item.key}><td>{item.label}</td><td>{item.amount}</td></tr>)}
                  <tr className={styles.quoteTotal}><td>Draft total</td><td>{formatMoney(quoteTotal)}</td></tr>
                </tbody>
              </table>
              <p className={styles.assumptionsTitle}>Assumptions</p>
              <ul className={styles.assumptions}>
                <li>{shipment.pallets} pallets, {formatSize(shipment)}, {shipment.pallet.weightKg} kg each, not stackable</li>
                <li>Collect {shipment.collectionWindow?.[0]}–{shipment.collectionWindow?.[1]}, deliver {shipment.deliveryWindow[0]}–{shipment.deliveryWindow[1]} tomorrow</li>
                <li>Tail-lift delivery, no forklift on site</li>
                <li>Example carrier rate card; excludes tax and waiting time</li>
                <li>Vehicle to be confirmed by dispatch</li>
              </ul>
              <p className={styles.quoteStatus}>Draft · commercial team reviews before sending</p>
            </div>
          ) : (
            <p className={styles.onHold}>{confirmed ? "Ready to prepare from the pricing inputs." : "Not prepared while dimensions are missing."}</p>
          )}
          {stage === 2 && <button type="button" className={styles.supply} onClick={() => setStage(3)}>Prepare the draft quote <ArrowRight size={14} aria-hidden="true" /></button>}
        </div>
      </div>
    </Example>
  );
}
