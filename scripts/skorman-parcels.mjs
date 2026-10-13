// Pulls public Lake County GIS data around Hills City Center into public/skorman/parcels.json
// for /skorman/propertytracker. Run with: npm run skorman:parcels
import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://gis.lakecountyfl.gov/lakegis/rest/services";
const CENTER = { lng: -81.72145, lat: 28.60651 }; // Crooked Can parcel, 1600 Crooked Can Loop
const RADIUS_MILES = 7;
const MIN_ACRES = 2;
const PAGE_SIZE = 1000;

const cities = [
  { name: "Minneola", zoning: 8, flu: 9 },
  { name: "Clermont", zoning: 1, flu: 1 },
  { name: "Montverde", zoning: 10, flu: 10 },
  { name: "Groveland", zoning: 3, flu: 4 },
];

const latSpan = RADIUS_MILES / 69;
const lngSpan = RADIUS_MILES / (69 * Math.cos((CENTER.lat * Math.PI) / 180));
const envelope = [CENTER.lng - lngSpan, CENTER.lat - latSpan, CENTER.lng + lngSpan, CENTER.lat + latSpan].join(",");

async function query(layer, params) {
  const features = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const search = new URLSearchParams({
      f: "json",
      inSR: "4326",
      outSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      ...params,
    });
    const response = await fetch(`${BASE}/${layer}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: search,
    });
    const data = await response.json();
    if (data.error) throw new Error(`${layer}: ${JSON.stringify(data.error)}`);
    features.push(...data.features);
    if (!data.exceededTransferLimit || data.features.length === 0) return features;
  }
}

function overlay(layer, outFields, idField = "OBJECTID") {
  return query(layer, {
    where: "1=1",
    geometry: envelope,
    geometryType: "esriGeometryEnvelope",
    outFields,
    returnGeometry: "true",
    maxAllowableOffset: "0.00005",
    geometryPrecision: "6",
    orderByFields: idField,
  });
}

function bboxOf(rings) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return [minX, minY, maxX, maxY];
}

// Even-odd across all rings handles holes without knowing ring orientation.
function insideRings([x, y], rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

const CELL = 0.01;
function spatialIndex(features) {
  const cells = new Map();
  for (const feature of features) {
    const rings = feature.geometry?.rings;
    if (!rings?.length) continue;
    const box = bboxOf(rings);
    const item = { rings, box, attributes: feature.attributes };
    for (let cx = Math.floor(box[0] / CELL); cx <= Math.floor(box[2] / CELL); cx++) {
      for (let cy = Math.floor(box[1] / CELL); cy <= Math.floor(box[3] / CELL); cy++) {
        const key = `${cx}:${cy}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(item);
      }
    }
  }
  return (point) => {
    const candidates = cells.get(`${Math.floor(point[0] / CELL)}:${Math.floor(point[1] / CELL)}`) ?? [];
    return candidates.filter(
      (item) =>
        point[0] >= item.box[0] && point[0] <= item.box[2] && point[1] >= item.box[1] && point[1] <= item.box[3] &&
        insideRings(point, item.rings),
    );
  };
}

function samplePoints(rings) {
  const [minX, minY, maxX, maxY] = bboxOf(rings);
  const steps = 7;
  const points = [];
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const point = [minX + ((i + 0.5) / steps) * (maxX - minX), minY + ((j + 0.5) / steps) * (maxY - minY)];
      if (insideRings(point, rings)) points.push(point);
    }
  }
  if (points.length === 0) {
    const ring = rings[0];
    points.push([ring.reduce((sum, p) => sum + p[0], 0) / ring.length, ring.reduce((sum, p) => sum + p[1], 0) / ring.length]);
  }
  return points;
}

function majority(values) {
  const counts = new Map();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function milesBetween(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

const clean = (value) => (typeof value === "string" ? value.trim() : value ?? "");
const isoDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;

async function main() {
  console.log(`Fetching parcels of ${MIN_ACRES}+ acres within ${RADIUS_MILES} miles of Crooked Can…`);
  const parcelFeatures = await query("OpenData/OpenData1/MapServer/12", {
    where: `Acres >= ${MIN_ACRES}`,
    geometry: `${CENTER.lng},${CENTER.lat}`,
    geometryType: "esriGeometryPoint",
    distance: String(Math.round(RADIUS_MILES * 1609.34)),
    units: "esriSRUnit_Meter",
    outFields:
      "AltKey,ParcelNumber,DeedAcreage,PropertyLink,OwnerName,OwnerAddress,OwnerCity,OwnerState,OwnerZip,OwnerCountry,PropertyAddress,PropertyName,Vacant,YearBuilt,LandValue,BuildingValue,TotalJustValue,LastSalePrice,LastSaleDate,LandUseCode,LandUseDescription,PropertyClassDescription,Acres",
    returnGeometry: "true",
    maxAllowableOffset: "0.00003",
    geometryPrecision: "6",
    orderByFields: "OBJECTID",
  });
  console.log(`  ${parcelFeatures.length} parcel shapes`);

  console.log("Fetching zoning, future land use, flood, wetlands, and county applications…");
  const [countyZoning, countyFlu, flood, wetlands, applications, ...cityLayers] = await Promise.all([
    overlay("OpenData/OpenData3/MapServer/10", "Zoning,ZoningNm"),
    overlay("OpenData/OpenData3/MapServer/9", "FLUCode,Label", "OBJECTID_1"),
    overlay("OpenData/OpenData3/MapServer/11", "FLD_ZONE,SFHA_TF"),
    overlay("OpenData/OpenData3/MapServer/13", "WetlandType"),
    query("Planning/CD_Plus_AppRequets/MapServer/0", {
      where: "1=1",
      geometry: envelope,
      geometryType: "esriGeometryEnvelope",
      outFields:
        "AlternateKey,ProjectName,ApplicantionCode,AppStatus,StageName,OpenDate,CloseDate,ApprovalDate,AppRequestDescription,Change,NumberUnits",
      returnGeometry: "false",
      orderByFields: "OBJECTID",
    }),
    ...cities.flatMap((city) => [
      overlay(`LocalGov/CityZoning/MapServer/${city.zoning}`, "ZoningCode"),
      overlay(`LocalGov/CityFLU/MapServer/${city.flu}`, "FLUCode"),
    ]),
  ]);

  const findCountyZoning = spatialIndex(countyZoning);
  const findCountyFlu = spatialIndex(countyFlu);
  const findFlood = spatialIndex(flood.filter((f) => f.attributes.SFHA_TF === "T"));
  const findWetland = spatialIndex(wetlands);
  const cityIndexes = cities.map((city, index) => ({
    name: city.name,
    findZoning: spatialIndex(cityLayers[index * 2]),
    findFlu: spatialIndex(cityLayers[index * 2 + 1]),
  }));

  // The county layer repeats each application once per review record, so collapse duplicates
  // and keep whichever copy carries the most dates.
  const applicationsByParcel = new Map();
  for (const { attributes: a } of applications) {
    const record = {
      type: clean(a.ApplicantionCode),
      status: clean(a.AppStatus),
      stage: clean(a.StageName),
      project: clean(a.ProjectName),
      description: clean(a.AppRequestDescription) || clean(a.Change),
      units: a.NumberUnits || null,
      opened: isoDate(a.OpenDate),
      closed: isoDate(a.CloseDate),
      approved: isoDate(a.ApprovalDate),
    };
    const identity = [record.type, record.status, record.project, record.description].join("|");
    for (const key of [clean(String(a.AlternateKey ?? "")), clean(a.FolioNumber)]) {
      if (!key) continue;
      if (!applicationsByParcel.has(key)) applicationsByParcel.set(key, new Map());
      const existing = applicationsByParcel.get(key).get(identity);
      const datesKnown = (item) => [item.opened, item.closed, item.approved].filter(Boolean).length;
      if (!existing || datesKnown(record) > datesKnown(existing)) applicationsByParcel.get(key).set(identity, record);
    }
  }
  const applicationsFor = (altKey, parcelNumber) => {
    const found = new Map([
      ...(applicationsByParcel.get(altKey) ?? new Map()),
      ...(applicationsByParcel.get(parcelNumber) ?? new Map()),
    ]);
    return [...found.values()].sort((x, y) => (y.opened || "").localeCompare(x.opened || ""));
  };

  const merged = new Map();
  for (const feature of parcelFeatures) {
    const key = clean(feature.attributes.AltKey);
    const rings = feature.geometry?.rings ?? [];
    if (!key || rings.length === 0) continue;
    const existing = merged.get(key);
    if (existing) {
      existing.rings.push(...rings);
      existing.acres += feature.attributes.Acres ?? 0;
    } else {
      merged.set(key, { attributes: feature.attributes, rings: [...rings], acres: feature.attributes.Acres ?? 0 });
    }
  }

  const parcels = [];
  for (const [id, { attributes: a, rings, acres }] of merged) {
    const points = samplePoints(rings);
    const share = (find) => points.filter((point) => find(point).length > 0).length / points.length;

    let jurisdiction = "Unincorporated Lake County";
    let zoning = "";
    let zoningName = "";
    let flu = "";
    let fluName = "";
    for (const city of cityIndexes) {
      const cityZoning = majority(points.map((point) => clean(city.findZoning(point)[0]?.attributes.ZoningCode)));
      const cityFlu = majority(points.map((point) => clean(city.findFlu(point)[0]?.attributes.FLUCode)));
      if (cityZoning || cityFlu) {
        jurisdiction = city.name;
        zoning = cityZoning;
        flu = cityFlu;
        break;
      }
    }
    if (jurisdiction === "Unincorporated Lake County") {
      const zoningHits = points.map((point) => findCountyZoning(point)[0]?.attributes).filter(Boolean);
      zoning = majority(zoningHits.map((hit) => clean(hit.Zoning)));
      zoningName = clean(zoningHits.find((hit) => clean(hit.Zoning) === zoning)?.ZoningNm);
      const fluHits = points.map((point) => findCountyFlu(point)[0]?.attributes).filter(Boolean);
      flu = majority(fluHits.map((hit) => clean(hit.FLUCode)));
      fluName = clean(fluHits.find((hit) => clean(hit.FLUCode) === flu)?.Label);
    }

    const center = {
      lng: points.reduce((sum, p) => sum + p[0], 0) / points.length,
      lat: points.reduce((sum, p) => sum + p[1], 0) / points.length,
    };

    parcels.push({
      id,
      parcelNumber: clean(a.ParcelNumber),
      owner: clean(a.OwnerName),
      ownerAddress: clean(a.OwnerAddress),
      ownerCity: clean(a.OwnerCity),
      ownerState: clean(a.OwnerState),
      ownerZip: clean(a.OwnerZip),
      ownerCountry: clean(a.OwnerCountry),
      address: clean(a.PropertyAddress),
      propertyName: clean(a.PropertyName),
      acres: round(acres, 2),
      deedAcres: clean(a.DeedAcreage),
      landUse: clean(a.LandUseDescription),
      landUseCode: clean(a.LandUseCode),
      propertyClass: clean(a.PropertyClassDescription),
      vacant: clean(a.Vacant) === "Yes",
      yearBuilt: clean(a.YearBuilt),
      landValue: a.LandValue ?? 0,
      buildingValue: a.BuildingValue ?? 0,
      justValue: a.TotalJustValue ?? 0,
      lastSalePrice: a.LastSalePrice ?? 0,
      lastSaleDate: isoDate(a.LastSaleDate),
      link: clean(a.PropertyLink),
      lat: round(center.lat, 6),
      lng: round(center.lng, 6),
      distanceMiles: round(milesBetween(CENTER, center), 2),
      jurisdiction,
      zoning,
      zoningName,
      flu,
      fluName,
      floodPct: Math.round(share(findFlood) * 100),
      wetlandPct: Math.round(share(findWetland) * 100),
      applications: applicationsFor(id, clean(a.ParcelNumber)),
      rings: rings.map((ring) => ring.map(([x, y]) => [round(x, 5), round(y, 5)])),
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    center: CENTER,
    radiusMiles: RADIUS_MILES,
    minAcres: MIN_ACRES,
    sources: [
      "Lake County GIS: Tax Parcels (property appraiser data)",
      "Lake County GIS: county zoning and future land use",
      "Lake County GIS: Minneola, Clermont, Montverde, and Groveland zoning and future land use",
      "Lake County GIS: FEMA flood zones and wetlands",
      "Lake County GIS: county development application requests (unincorporated areas only)",
    ],
    parcels,
  };

  await mkdir(new URL("../public/skorman/", import.meta.url), { recursive: true });
  await writeFile(new URL("../public/skorman/parcels.json", import.meta.url), JSON.stringify(output));
  console.log(`Wrote ${parcels.length} parcels (${applications.length} county applications in the area).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
