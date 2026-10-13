"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { Parcel, Scored } from "./parcels";

type Props = {
  parcels: Scored[];
  related: Parcel[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function scoreColor(score: number) {
  if (score >= 60) return "#fdd907";
  if (score >= 40) return "#f59e0b";
  if (score >= 20) return "#38bdf8";
  return "#71717a";
}

const toLatLng = (rings: number[][][]) => rings.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]));

export function ParcelMap({ parcels, related, center, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const select = useRef(onSelect);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      const instance = L.map(container.current, { preferCanvas: true, zoomControl: true }).setView([center.lat, center.lng], 13);
      const esri = "https://server.arcgisonline.com/ArcGIS/rest/services";
      const dark = L.layerGroup([
        L.tileLayer(`${esri}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, { attribution: "&copy; Esri", maxNativeZoom: 16, maxZoom: 19 }),
        L.tileLayer(`${esri}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19 }),
      ]).addTo(instance);
      const satellite = L.tileLayer(`${esri}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, { attribution: "Imagery &copy; Esri", maxZoom: 19 });
      L.control.layers({ Map: dark, Satellite: satellite }, undefined, { position: "topright" }).addTo(instance);
      L.circleMarker([center.lat, center.lng], { radius: 7, color: "#ffffff", weight: 2, fillColor: "#fdd907", fillOpacity: 1 })
        .bindTooltip("Crooked Can · Hills City Center")
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
    const L = leaflet.current;
    const group = layer.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    for (const parcel of related) {
      L.polygon(toLatLng(parcel.rings), { color: "#e4e4e7", weight: 1.5, dashArray: "4 4", fill: false, interactive: false }).addTo(group);
    }
    for (const parcel of parcels) {
      const selected = parcel.id === selectedId;
      const color = scoreColor(parcel.score);
      L.polygon(toLatLng(parcel.rings), {
        color: selected ? "#ffffff" : color,
        weight: selected ? 3 : 1,
        fillColor: color,
        fillOpacity: selected ? 0.55 : 0.28,
      })
        .bindTooltip(`${parcel.score} · ${parcel.acres.toFixed(1)} ac · ${parcel.owner}`)
        .on("click", () => select.current(parcel.id))
        .addTo(group);
    }
  }, [ready, parcels, related, selectedId]);

  useEffect(() => {
    const instance = map.current;
    const parcel = parcels.find((item) => item.id === selectedId);
    if (!ready || !instance || !parcel) return;
    if (!instance.getBounds().contains([parcel.lat, parcel.lng])) instance.panTo([parcel.lat, parcel.lng]);
  }, [ready, selectedId, parcels]);

  return <div ref={container} className="h-full w-full bg-[#111]" aria-label="Map of candidate parcels" role="region" />;
}
