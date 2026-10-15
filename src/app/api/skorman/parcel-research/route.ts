import { Output, ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const GIS = "https://gis.lakecountyfl.gov/lakegis/rest/services";
const METERS_PER_MILE = 1609.34;

async function countyQuery(layer: string, params: Record<string, string>) {
  const response = await fetch(`${GIS}/${layer}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ f: "json", inSR: "4326", returnGeometry: "false", ...params }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message ?? "County GIS request failed");
  return (data.features as { attributes: Record<string, string | number | null> }[]).map((feature) => feature.attributes);
}

const nearPoint = (lat: number, lng: number, miles: number) => ({
  geometry: `${lng},${lat}`,
  geometryType: "esriGeometryPoint",
  spatialRel: "esriSpatialRelIntersects",
  distance: String(Math.round(miles * METERS_PER_MILE)),
  units: "esriSRUnit_Meter",
});

const date = (value: string | number | null) => (typeof value === "number" ? new Date(value).toISOString().slice(0, 10) : "");
const text = (value: string | number | null) => String(value ?? "").trim();

const tools = {
  parcelSales: tool({
    description: "Recorded sales for one parcel from the Lake County property appraiser. The county layer only covers recent years, so an empty result does not mean the parcel never sold.",
    inputSchema: z.object({ parcelNumber: z.string().regex(/^[0-9A-Z]{10,20}$/) }),
    execute: async ({ parcelNumber }) =>
      (await countyQuery("SalesHistory/FeatureServer/0", { where: `ParcelNumber='${parcelNumber}'`, outFields: "SaleDate,SalePrice,QualificationStatus,VacantImproved" }))
        .map((sale) => ({ date: date(sale.SaleDate), price: sale.SalePrice, qualified: sale.QualificationStatus === "Q", vacantAtSale: sale.VacantImproved === "V" }))
        .sort((a, b) => b.date.localeCompare(a.date)),
  }),
  nearbyLandSales: tool({
    description: "Recent qualified sales of vacant land near a point. Use parcelLookup on a few results to get acreage and compute price per acre.",
    inputSchema: z.object({ lat: z.number(), lng: z.number(), radiusMiles: z.number().min(0.25).max(3), sinceYear: z.number().int().min(2015).max(2030) }),
    execute: async ({ lat, lng, radiusMiles, sinceYear }) =>
      (await countyQuery("SalesHistory/FeatureServer/0", {
        where: `VacantImproved='V' AND QualificationStatus='Q' AND SalePrice > 50000 AND SaleDate >= DATE '${sinceYear}-01-01'`,
        outFields: "ParcelNumber,PhysicalStreetAddress,SalePrice,SaleDate",
        resultRecordCount: "40",
        ...nearPoint(lat, lng, radiusMiles),
      })).map((sale) => ({ parcelNumber: text(sale.ParcelNumber), address: text(sale.PhysicalStreetAddress), price: sale.SalePrice, date: date(sale.SaleDate) })),
  }),
  parcelLookup: tool({
    description: "Current property appraiser facts for a parcel: acres, owner, land use, and assessed values.",
    inputSchema: z.object({ parcelNumber: z.string().regex(/^[0-9A-Z]{10,20}$/) }),
    execute: async ({ parcelNumber }) =>
      (await countyQuery("OpenData/OpenData1/MapServer/12", {
        where: `ParcelNumber='${parcelNumber}'`,
        outFields: "ParcelNumber,OwnerName,PropertyAddress,Acres,LandUseDescription,TotalJustValue,LastSalePrice,LastSaleDate",
      })).map((parcel) => ({
        parcelNumber: text(parcel.ParcelNumber),
        owner: text(parcel.OwnerName),
        address: text(parcel.PropertyAddress),
        acres: parcel.Acres,
        landUse: text(parcel.LandUseDescription),
        justValue: parcel.TotalJustValue,
        lastSale: { price: parcel.LastSalePrice, date: date(parcel.LastSaleDate) },
      })),
  }),
  nearbyApplications: tool({
    description:
      "Development applications filed with Lake County (unincorporated areas only) near a point. This layer stopped updating in April 2021, so it only covers 2018 to early 2021, and a PENDING status means pending as of 2021, not today. Use it for history, not current activity.",
    inputSchema: z.object({ lat: z.number(), lng: z.number(), radiusMiles: z.number().min(0.25).max(2) }),
    execute: async ({ lat, lng, radiusMiles }) => {
      const rows = await countyQuery("Planning/CD_Plus_AppRequets/MapServer/0", {
        where: "1=1",
        outFields: "ProjectName,ApplicantionCode,AppStatus,OpenDate,AppRequestDescription,Change,NumberUnits,FolioNumber",
        resultRecordCount: "400",
        ...nearPoint(lat, lng, radiusMiles),
      });
      const unique = new Map<string, Record<string, string | number | null>>();
      for (const row of rows) unique.set([row.ApplicantionCode, row.AppStatus, row.ProjectName, row.AppRequestDescription].join("|"), row);
      return [...unique.values()].slice(0, 60).map((row) => ({
        type: text(row.ApplicantionCode),
        status: text(row.AppStatus),
        project: text(row.ProjectName),
        request: text(row.AppRequestDescription) || text(row.Change),
        units: row.NumberUnits || null,
        opened: date(row.OpenDate),
        parcelNumber: text(row.FolioNumber),
      }));
    },
  }),
};

const briefSchema = z.object({
  verdict: z.enum(["Worth a closer look", "Maybe", "Probably not"]),
  summary: z.string().describe("Two or three plain-English sentences."),
  whyItMayFit: z.array(z.string()),
  obstacles: z.array(z.string()),
  nearbyActivity: z.array(z.string()).describe("What sales and applications around the parcel show, with dates and prices."),
  questionsToVerify: z.array(z.string()),
});

const agent = new ToolLoopAgent({
  model: process.env.SKORMAN_RESEARCH_MODEL || "anthropic/claude-sonnet-5.5",
  instructions: `You research land for Skorman Development, an Orlando developer. Skorman develops rather than buying finished buildings. It looks for well-located land, especially near Hills City Center and the Crooked Can food hall in Minneola, that is held back by zoning or approval problems it can solve. Its team is experienced at rezoning and entitlements.

Use the tools to check this parcel's sale history, recent vacant land sales nearby (look up acreage on a few to estimate price per acre), and nearby county development applications. Then write a short brief for Max, who decides whether to call the owner.

Rules:
- Use only facts from the parcel record and tool results. Say when something is unknown.
- County applications cover unincorporated Lake County only, from 2018 to early 2021, not city applications in Minneola or Clermont. Never describe them as currently pending.
- Price per acre is the sale price divided by the acreage from parcelLookup. Only report it when you have both numbers, and show both.
- Do not give legal advice, valuations, or claims about the owner's willingness to sell.
- Keep each list item to one sentence.`,
  tools,
  output: Output.object({ schema: briefSchema }),
  stopWhen: isStepCount(12),
});

const parcelSchema = z.object({
  parcelNumber: z.string().max(30),
  owner: z.string().max(200),
  address: z.string().max(200),
  acres: z.number(),
  lat: z.number(),
  lng: z.number(),
  jurisdiction: z.string().max(80),
  zoning: z.string().max(120),
  zoningName: z.string().max(120),
  flu: z.string().max(120),
  fluName: z.string().max(120),
  landUse: z.string().max(120),
  justValue: z.number(),
  lastSaleDate: z.string().max(20),
  lastSalePrice: z.number(),
  distanceMiles: z.number(),
  wetlandPct: z.number(),
  floodPct: z.number(),
  signals: z.array(z.string().max(400)).max(20),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Not allowed." }, { status: 403 });
  if (process.env.SKORMAN_RESEARCH_ENABLED !== "true") {
    return Response.json({ error: "AI research isn't switched on yet." }, { status: 503 });
  }

  const parsed = parcelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid parcel." }, { status: 400 });

  try {
    const result = await agent.generate({ prompt: `Parcel record:\n${JSON.stringify(parsed.data, null, 2)}` });
    return Response.json({ brief: result.output });
  } catch (error) {
    console.error("parcel-research", error);
    return Response.json({ error: "The research run failed. Try again in a minute." }, { status: 502 });
  }
}
