"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import type { Decision, Parcel, Scored } from "./parcels";

export type MapView = "parcels" | "satellite";

type Props = {
  view: MapView;
  parcels: Scored[];
  related: Parcel[];
  decisions: Decision[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  focus: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
  onSelectDecision: (decision: Decision) => void;
};

export function scoreColor(score: number) {
  if (score >= 60) return "#fdd907";
  if (score >= 40) return "#3d9bff";
  if (score >= 20) return "#9a9a97";
  return "#5a5a58";
}

const toLatLng = (rings: number[][][]) => rings.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]));
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

export function ParcelMap({ view, parcels, related, decisions, center, selectedId, focus, onSelect, onSelectDecision }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const bases = useRef<Record<MapView, TileLayer[]> | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const select = useRef(onSelect);
  const selectDecision = useRef(onSelectDecision);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    select.current = onSelect;
    selectDecision.current = onSelectDecision;
  }, [onSelect, onSelectDecision]);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      const instance = L.map(container.current, { preferCanvas: true, zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], 13);
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      bases.current = {
        parcels: [
          L.tileLayer(`${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, { attribution: "Esri", maxNativeZoom: 16, maxZoom: 19 }),
          L.tileLayer(`${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19 }),
        ],
        satellite: [
          L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, { attribution: "Imagery Esri, Maxar", maxZoom: 19 }),
          L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19 }),
        ],
      };
      L.marker([center.lat, center.lng], {
        icon: L.divIcon({ className: "", html: '<span class="pt-anchor" aria-hidden="true"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        keyboard: false,
      })
        .bindTooltip("Crooked Can · Hills City Center", { direction: "top" })
        .addTo(instance);
      layer.current = L.layerGroup().addTo(instance);
      leaflet.current = L;
      map.current = instance;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !bases.current) return;
    for (const [name, tiles] of Object.entries(bases.current)) {
      for (const tile of tiles) {
        if (name === view && !instance.hasLayer(tile)) tile.addTo(instance);
        if (name !== view && instance.hasLayer(tile)) instance.removeLayer(tile);
      }
    }
    for (const tile of bases.current[view]) tile.bringToBack();
  }, [ready, view]);

  useEffect(() => {
    const L = leaflet.current;
    const group = layer.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    const satellite = view === "satellite";
    for (const parcel of related) {
      L.polygon(toLatLng(parcel.rings), { color: "#eeeeec", weight: 1.25, dashArray: "4 4", fill: false, interactive: false }).addTo(group);
    }
    for (const parcel of parcels) {
      const selected = parcel.id === selectedId;
      const color = scoreColor(parcel.score);
      L.polygon(toLatLng(parcel.rings), {
        color: selected ? "#ffffff" : color,
        weight: selected ? 3 : satellite ? 1.75 : 1,
        fillColor: color,
        fillOpacity: satellite ? (selected ? 0.12 : 0.04) : selected ? 0.45 : 0.22,
      })
        .bindTooltip(`${parcel.score} · ${parcel.acres.toFixed(1)} ac · ${parcel.owner}`, { sticky: true })
        .on("click", () => select.current(parcel.id))
        .addTo(group);
    }
    for (const decision of decisions) {
      if (!decision.point) continue;
      L.marker([decision.point.lat, decision.point.lng], {
        icon: L.divIcon({ className: "", html: '<span class="pt-decision" aria-hidden="true"></span>', iconSize: [14, 14], iconAnchor: [7, 7] }),
        title: `${decision.name}: ${decision.reasons[0] ?? ""}`,
      })
        .bindTooltip(`${decision.government} · ${decision.name || decision.caseNumber}<br>${decision.reasons[0] ?? ""}`, { direction: "top" })
        .on("click", () => selectDecision.current(decision))
        .addTo(group);
    }
  }, [ready, view, parcels, related, decisions, selectedId]);

  useEffect(() => {
    const instance = map.current;
    const L = leaflet.current;
    const parcel = parcels.find((item) => item.id === selectedId);
    if (!ready || !instance || !L || !parcel) return;
    const bounds = L.latLngBounds(toLatLng(parcel.rings).flat());
    if (instance.getZoom() < 15 || !instance.getBounds().pad(-0.1).contains(bounds)) {
      instance.flyToBounds(bounds, { maxZoom: 17, padding: [60, 60], duration: 0.6 });
    }
  }, [ready, selectedId, parcels]);

  useEffect(() => {
    if (!ready || !map.current || !focus) return;
    map.current.flyTo([focus.lat, focus.lng], Math.max(map.current.getZoom(), 16), { duration: 0.6 });
  }, [ready, focus]);

  return <div ref={container} className="h-full w-full bg-[#0b0b0b]" role="region" aria-label="Map of candidate parcels and rejected applications" />;
}
