// Pulls public Lake County GIS data around Hills City Center into public/skorman/parcels.json
// for /skorman/propertytracker. Run `npm run skorman:decisions` first, then `npm run skorman:parcels`.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const BASE = "https://gis.lakecountyfl.gov/lakegis/rest/services";
const CENTER = { lng: -81.72145, lat: 28.60651 }; // Crooked Can parcel, 1600 Crooked Can Loop
const RADIUS_MILES = 7;
const DECISION_RADIUS_MILES = 10;
const MIN_ACRES = 2;
const PAGE_SIZE = 1000;
const PARCEL_FIELDS =
  "AltKey,ParcelNumber,DeedAcreage,PropertyLink,OwnerName,OwnerAddress,OwnerCity,OwnerState,OwnerZip,OwnerCountry,PropertyAddress,PropertyName,Vacant,YearBuilt,LandValue,BuildingValue,TotalJustValue,LastSalePrice,LastSaleDate,LandUseCode,LandUseDescription,PropertyClassDescription,Acres";

const cities = [
  { name: "Minneola", zoning: 8, flu: 9 },
  { name: "Clermont", zoning: 1, flu: 1 },
  { name: "Montverde", zoning: 10, flu: 10 },
  { name: "Groveland", zoning: 3, flu: 4 },
  { name: "Astatula", zoning: 0, flu: 0 },
  { name: "Howey-In-The-Hills", zoning: 9, flu: null },
];

const span = (miles) => ({ lat: miles / 69, lng: miles / (69 * Math.cos((CENTER.lat * Math.PI) / 180)) });
const box = span(DECISION_RADIUS_MILES);
const envelope = [CENTER.lng - box.lng, CENTER.lat - box.lat, CENTER.lng + box.lng, CENTER.lat + box.lat].join(",");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function query(layer, params) {
  const features = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${BASE}/${layer}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        f: "json",
        inSR: "4326",
        outSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        resultOffset: String(offset),
        resultRecordCount: String(PAGE_SIZE),
        ...params,
      }),
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

async function latest(layer, field) {
  const response = await fetch(`${BASE}/${layer}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      f: "json",
      where: "1=1",
      outStatistics: JSON.stringify([{ statisticType: "max", onStatisticField: field, outStatisticFieldName: "latest" }]),
    }),
  });
  const value = (await response.json()).features?.[0]?.attributes?.latest;
  return value ? new Date(value).toISOString().slice(0, 10) : "";
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

async function parcelsByKey(field, values) {
  const found = [];
  for (let i = 0; i < values.length; i += 25) {
    const list = values.slice(i, i + 25).map((value) => `'${value.replace(/[^0-9A-Z]/gi, "")}'`).join(",");
    found.push(
      ...(await query("OpenData/OpenData1/MapServer/12", {
        where: `${field} IN (${list})`,
        outFields: PARCEL_FIELDS,
        returnGeometry: "true",
        maxAllowableOffset: "0.00003",
        geometryPrecision: "6",
      })),
    );
    await sleep(250);
  }
  return found;
}

async function parcelAtPoint({ lat, lng }) {
  return query("OpenData/OpenData1/MapServer/12", {
    where: "1=1",
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    outFields: PARCEL_FIELDS,
    returnGeometry: "true",
    maxAllowableOffset: "0.00003",
    geometryPrecision: "6",
  });
}

const STREET_SUFFIX = /\b(Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Boulevard|Blvd|Highway|Hwy|Lane|Ln|Way|Court|Ct)\b\.?/gi;

// Old applications often name parcels that have since been split, so fall back to the address or
// street corner written in the application to find the land today.
async function locateFromText(decision) {
  const text = `${decision.name} ${decision.location} ${decision.request}`;
  const address = text.match(/\b(\d{2,6})\s+(?:[NSEW]\.?\s+)?([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)?)\s+(?:Ave|Avenue|St|Street|Rd|Road|Dr|Drive|Blvd|Boulevard|Way|Ln|Lane|Ct|Court|Pl|Place)\b/);
  if (address) {
    const hits = await query("OpenData/OpenData1/MapServer/11", {
      where: `AddressNumber = ${Number(address[1])} AND BaseStreetName = '${address[2].toUpperCase().replace(/[^A-Z ]/g, "")}'`,
      outFields: "FullAddress",
      returnGeometry: "true",
      geometry: envelope,
      geometryType: "esriGeometryEnvelope",
    });
    if (hits[0]?.geometry) return { point: { lat: round(hits[0].geometry.y, 6), lng: round(hits[0].geometry.x, 6) }, method: `address ${address[0]}` };
  }
  const corner = text.match(/corner of ([A-Za-z0-9.' ]+?)\s+(?:and|&)\s+([A-Za-z0-9.' ]+?)(?=[,.;]|\s(?:in|for|to|on|within)\s|$)/i);
  if (corner) {
    const streets = await Promise.all(
      [corner[1], corner[2]].map((part) =>
        query("OpenData/OpenData1/MapServer/7", {
          where: `FullStreetName LIKE '%${part.replace(STREET_SUFFIX, "").trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "")}%'`,
          outFields: "FullStreetName",
          returnGeometry: "true",
          geometry: envelope,
          geometryType: "esriGeometryEnvelope",
        }),
      ),
    );
    let best = null;
    for (const a of streets[0].flatMap((feature) => feature.geometry?.paths?.flat() ?? [])) {
      for (const b of streets[1].flatMap((feature) => feature.geometry?.paths?.flat() ?? [])) {
        const gap = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (!best || gap < best.gap) best = { gap, lat: (a[1] + b[1]) / 2, lng: (a[0] + b[0]) / 2 };
      }
    }
    if (best && best.gap < 0.003) return { point: { lat: round(best.lat, 6), lng: round(best.lng, 6) }, method: `intersection of ${corner[1]} and ${corner[2]}` };
  }
  return null;
}

async function main() {
  const decisionFile = JSON.parse(await readFile(new URL("../public/skorman/decisions.json", import.meta.url), "utf8").catch(() => '{"decisions":[],"approvedLakeCountyCases":[]}'));
  const decisions = decisionFile.decisions;

  console.log(`Fetching parcels of ${MIN_ACRES}+ acres within ${RADIUS_MILES} miles of Crooked Can…`);
  const parcelFeatures = await query("OpenData/OpenData1/MapServer/12", {
    where: `Acres >= ${MIN_ACRES}`,
    geometry: `${CENTER.lng},${CENTER.lat}`,
    geometryType: "esriGeometryPoint",
    distance: String(Math.round(RADIUS_MILES * 1609.34)),
    units: "esriSRUnit_Meter",
    outFields: PARCEL_FIELDS,
    returnGeometry: "true",
    maxAllowableOffset: "0.00003",
    geometryPrecision: "6",
    orderByFields: "OBJECTID",
  });
  console.log(`  ${parcelFeatures.length} parcel shapes`);

  const known = new Set(parcelFeatures.map((feature) => clean(feature.attributes.AltKey)));
  const knownNumbers = new Set(parcelFeatures.map((feature) => clean(feature.attributes.ParcelNumber)));
  const missingKeys = [...new Set(decisions.flatMap((decision) => decision.parcelKeys))].filter((key) => !known.has(key));
  const missingNumbers = [...new Set(decisions.flatMap((decision) => decision.parcelNumbers))].filter((number) => !knownNumbers.has(number));
  console.log(`Fetching ${missingKeys.length + missingNumbers.length} parcels named in decisions…`);
  const decisionFeatures = [...(await parcelsByKey("AltKey", missingKeys)), ...(await parcelsByKey("ParcelNumber", missingNumbers))];
  const foundKeys = new Set([...known, ...decisionFeatures.map((feature) => clean(feature.attributes.AltKey))]);
  const foundNumbers = new Set([...knownNumbers, ...decisionFeatures.map((feature) => clean(feature.attributes.ParcelNumber))]);
  for (const decision of decisions) {
    const linked = decision.parcelKeys.some((key) => foundKeys.has(key)) || decision.parcelNumbers.some((number) => foundNumbers.has(number));
    if (linked) {
      decision.located = "parcel number in the record";
      continue;
    }
    if (decision.point) {
      decision.located = decision.parcelKeys.length ? "application map (the original parcel has since been split or renumbered)" : "official record location";
    } else {
      const found = await locateFromText(decision);
      if (!found) continue;
      decision.point = found.point;
      decision.located = `${found.method}, because the original parcel has since been split or renumbered`;
    }
    decisionFeatures.push(...(await parcelAtPoint(decision.point)));
    await sleep(200);
  }

  console.log("Fetching zoning, land-use plan, city limits, annexations, flood, wetlands, and planned subdivisions…");
  const [countyZoning, countyFlu, flood, wetlands, cityLimits, annexations, futureSubdivisions, districts, ...cityLayers] = await Promise.all([
    overlay("OpenData/OpenData3/MapServer/10", "Zoning,ZoningNm,OrdNum,OrdDate,ZonChg"),
    overlay("OpenData/OpenData3/MapServer/9", "FLUCode,Label", "OBJECTID_1"),
    overlay("OpenData/OpenData3/MapServer/11", "FLD_ZONE,SFHA_TF"),
    overlay("OpenData/OpenData3/MapServer/13", "WetlandType"),
    overlay("GIS/CityLimits/MapServer/0", "City"),
    overlay("OpenData/OpenData2/MapServer/4", "City,Ordinance,AnnexationDate"),
    overlay("InteractiveMap/MapServer/112", "Name"),
    overlay("InteractiveMap/MapServer/67", "District_Name,Active_Inactive"),
    ...cities.flatMap((city) => [
      overlay(`LocalGov/CityZoning/MapServer/${city.zoning}`, "ZoningCode"),
      city.flu === null ? Promise.resolve([]) : overlay(`LocalGov/CityFLU/MapServer/${city.flu}`, "FLUCode"),
    ]),
  ]);

  const freshness = {
    countyZoning: await latest("OpenData/OpenData3/MapServer/10", "OrdDate"),
    countyPlan: await latest("OpenData/OpenData3/MapServer/9", "Amend_Date"),
    annexations: await latest("OpenData/OpenData2/MapServer/4", "AnnexationDate"),
    cityZoning: Object.fromEntries(
      await Promise.all(cities.map(async (city) => [city.name, await latest(`LocalGov/CityZoning/MapServer/${city.zoning}`, "UploadDate")])),
    ),
  };

  const findCountyZoning = spatialIndex(countyZoning);
  const findCountyFlu = spatialIndex(countyFlu);
  const findFlood = spatialIndex(flood.filter((feature) => feature.attributes.SFHA_TF === "T"));
  const findWetland = spatialIndex(wetlands);
  const findCity = spatialIndex(cityLimits);
  const findAnnexation = spatialIndex(annexations);
  const findSubdivision = spatialIndex(futureSubdivisions);
  const findDistrict = spatialIndex(districts);
  const cityIndexes = cities.map((city, index) => ({
    name: city.name,
    findZoning: spatialIndex(cityLayers[index * 2]),
    findFlu: spatialIndex(cityLayers[index * 2 + 1]),
  }));

  const shapeKey = (feature) => `${clean(feature.attributes.AltKey)}:${feature.geometry?.rings?.[0]?.[0]?.join(",")}`;
  const extraFeatures = [...new Map(decisionFeatures.map((feature) => [shapeKey(feature), feature])).values()].filter(
    (feature) => !known.has(clean(feature.attributes.AltKey)),
  );
  const merged = new Map();
  for (const feature of [...parcelFeatures, ...extraFeatures]) {
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

  const titleCase = (value) => clean(value).toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  const parcels = [];
  for (const [id, { attributes: a, rings, acres }] of merged) {
    const grid = samplePoints(rings);
    // Thin or oddly shaped parcels can miss every grid point, so add points along the boundary.
    const edge = rings.flat().filter((_, index, all) => index % Math.max(1, Math.floor(all.length / 30)) === 0);
    const points = grid.length >= 6 ? grid : [...grid, ...edge];
    const center = {
      lng: points.reduce((sum, p) => sum + p[0], 0) / points.length,
      lat: points.reduce((sum, p) => sum + p[1], 0) / points.length,
    };
    const distanceMiles = milesBetween(CENTER, center);
    if (distanceMiles > DECISION_RADIUS_MILES) continue;
    const share = (find) => points.filter((point) => find(point).length > 0).length / points.length;
    const first = (find) => points.map((point) => find(point)[0]?.attributes).find(Boolean);

    const cityName = titleCase(majority(points.map((point) => clean(findCity(point)[0]?.attributes.City))));
    const jurisdiction = cityName || "Unincorporated Lake County";
    let zoning = "";
    let zoningName = "";
    let flu = "";
    let fluName = "";
    let zoningSource = "";
    let lastRezoning = null;
    const city = cityIndexes.find((item) => item.name === cityName);
    if (city) {
      zoning = majority(points.map((point) => clean(city.findZoning(point)[0]?.attributes.ZoningCode)));
      flu = majority(points.map((point) => clean(city.findFlu(point)[0]?.attributes.FLUCode)));
      zoningSource = `${city.name} map in county GIS${freshness.cityZoning[city.name] ? `, uploaded ${freshness.cityZoning[city.name]}` : ", undated"}`;
    } else if (!cityName) {
      const zoningHits = points.map((point) => findCountyZoning(point)[0]?.attributes).filter(Boolean);
      zoning = majority(zoningHits.map((hit) => clean(hit.Zoning)));
      const hit = zoningHits.find((item) => clean(item.Zoning) === zoning);
      zoningName = clean(hit?.ZoningNm);
      if (hit?.OrdNum && clean(hit.OrdNum)) lastRezoning = { ordinance: clean(hit.OrdNum), date: isoDate(hit.OrdDate), change: clean(hit.ZonChg) };
      const fluHits = points.map((point) => findCountyFlu(point)[0]?.attributes).filter(Boolean);
      flu = majority(fluHits.map((item) => clean(item.FLUCode)));
      fluName = clean(fluHits.find((item) => clean(item.FLUCode) === flu)?.Label);
      zoningSource = `Lake County zoning map (ordinances through ${freshness.countyZoning})`;
    } else {
      zoningSource = `${cityName} zoning is not in the county GIS`;
    }

    const annexation = first(findAnnexation);
    const annexed = annexation
      ? { city: titleCase(annexation.City), ordinance: clean(annexation.Ordinance), date: isoDate(annexation.AnnexationDate) }
      : null;
    const subdivision = first(findSubdivision);
    const district = first(findDistrict);

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
      distanceMiles: round(distanceMiles, 2),
      inStudyArea: distanceMiles <= RADIUS_MILES && acres >= MIN_ACRES,
      jurisdiction,
      zoning,
      zoningName,
      zoningSource,
      flu,
      fluName,
      lastRezoning,
      annexed,
      plannedSubdivision: clean(subdivision?.Name),
      developmentDistrict: clean(district?.District_Name),
      floodPct: Math.round(share(findFlood) * 100),
      wetlandPct: Math.round(share(findWetland) * 100),
      decisionIds: decisions
        .filter((decision) => decision.parcelKeys.includes(id) || decision.parcelNumbers.includes(clean(a.ParcelNumber)) || (decision.point && insideRings([decision.point.lng, decision.point.lat], rings)))
        .map((decision) => decision.id),
      rings: rings.map((ring) => ring.map(([x, y]) => [round(x, 5), round(y, 5)])),
    });
  }

  for (const decision of decisions) {
    const linked = parcels.filter((parcel) => parcel.decisionIds.includes(decision.id));
    decision.parcelIds = linked.map((parcel) => parcel.id);
    if (!decision.point && linked.length > 0) {
      decision.point = {
        lat: round(linked.reduce((sum, parcel) => sum + parcel.lat, 0) / linked.length, 6),
        lng: round(linked.reduce((sum, parcel) => sum + parcel.lng, 0) / linked.length, 6),
      };
    }
    decision.distanceMiles = decision.point ? round(milesBetween(CENTER, decision.point), 2) : null;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    center: CENTER,
    radiusMiles: RADIUS_MILES,
    minAcres: MIN_ACRES,
    freshness,
    decisionCoverage: decisionFile.coverage ?? [],
    decisions: decisions.filter((decision) => decision.distanceMiles !== null && decision.distanceMiles <= DECISION_RADIUS_MILES),
    approvals: (decisionFile.approvedLakeCountyCases ?? [])
      .map((approval) => {
        const linked = parcels.filter((parcel) => approval.parcelKeys.includes(parcel.id));
        if (linked.length === 0) return null;
        return { ...approval, lat: linked[0].lat, lng: linked[0].lng };
      })
      .filter(Boolean),
    sources: [
      "Lake County GIS: tax parcels (property appraiser data)",
      `Lake County GIS: county zoning (ordinances through ${freshness.countyZoning}) and future land use (amendments through ${freshness.countyPlan})`,
      `Lake County GIS: city zoning and land use for ${cities.map((city) => `${city.name}${freshness.cityZoning[city.name] ? ` (uploaded ${freshness.cityZoning[city.name]})` : " (undated)"}`).join(", ")}`,
      `Lake County GIS: city limits and annexations (through ${freshness.annexations})`,
      "Lake County GIS: FEMA flood zones, wetlands, platted future subdivisions, and community development districts",
      "Lake County, Clermont, and Minneola meeting records (see decision sources)",
    ],
    parcels,
  };

  await mkdir(new URL("../public/skorman/", import.meta.url), { recursive: true });
  await writeFile(new URL("../public/skorman/parcels.json", import.meta.url), JSON.stringify(output));
  const linked = parcels.filter((parcel) => parcel.decisionIds.length > 0).length;
  console.log(`Wrote ${parcels.length} parcels, ${output.decisions.length} decisions (${linked} parcels linked to a decision).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
