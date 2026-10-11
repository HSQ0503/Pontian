/*
 * One fictional specialty coffee retailer runs through every example:
 * three stores, one loyalty customer (Maya), and four catalog items.
 * Every figure on the page, and every bag on a shelf, is computed from these records.
 */

export type ProductId = "house" | "reserve" | "brewer" | "tasting";

export const PRODUCTS: Record<ProductId, { name: string; short: string; price: number; catalog: string }> = {
  house: { name: "House Blend, 250 g", short: "House Blend", price: 16, catalog: "Medium roast. Milk chocolate, toasted almond." },
  reserve: { name: "Reserve Blend, 250 g", short: "Reserve Blend", price: 24, catalog: "Medium-dark roast. Dark chocolate, cherry, brown sugar." },
  brewer: { name: "Ceramic pour-over brewer", short: "Pour-over brewer", price: 38, catalog: "Brews one or two cups." },
  tasting: { name: "Coffee tasting session", short: "Tasting session", price: 15, catalog: "45 minutes. Five coffees, including both blends." },
};

export type Receipt = { id: string; date: string; short: string; daysAgo: number; store: string; items: ProductId[] };

export const BRIEFING_DATE = "3 June";
export const RECEIPTS: Receipt[] = [
  { id: "r1", date: "8 March", short: "8 Mar", daysAgo: 87, store: "Harbor Street", items: ["brewer", "house"] },
  { id: "r2", date: "6 April", short: "6 Apr", daysAgo: 58, store: "Harbor Street", items: ["house"] },
  { id: "r3", date: "5 May", short: "5 May", daysAgo: 29, store: "Harbor Street", items: ["house"] },
];

// Harbor Street's 08:00 count on 3 June. Reserve Blend is the same 6 bags used in the stock example.
export const HARBOR_HOUSE_BLEND = 18;
export const TASTING_SLOT = { when: "Saturday 10:00", open: 3, places: 8 };

export type LocationId = "harbor" | "market" | "riverside";
export type Location = { id: LocationId; name: string; stock: number; weeks: number[]; incoming: number; incomingDays?: number; reserve?: number };

// Reserve Blend, 250 g bags. Stock is the 08:00 count on 3 June; weekly sales are the four weeks to 2 June.
export const LOCATIONS: Location[] = [
  { id: "harbor", name: "Harbor Street", stock: 6, weeks: [8, 9, 9, 10], incoming: 0 },
  { id: "market", name: "Market Square", stock: 40, weeks: [3, 4, 4, 5], incoming: 0, reserve: 16 },
  { id: "riverside", name: "Riverside", stock: 14, weeks: [5, 6, 6, 7], incoming: 12, incomingDays: 6 },
];

export const location = (id: LocationId) => LOCATIONS.find((item) => item.id === id) ?? LOCATIONS[0];

// Forecast is the recent four-week average times two weeks; the range uses the slowest and fastest week.
export function forecastOf(item: Location) {
  const recent = item.weeks.reduce((sum, week) => sum + week, 0);
  const weekly = recent / item.weeks.length;
  return { recent, weekly, expected: weekly * 2, low: Math.min(...item.weeks) * 2, high: Math.max(...item.weeks) * 2 };
}

const harbor = location("harbor");
const market = location("market");

export const TRANSFER = forecastOf(harbor).expected - harbor.stock - harbor.incoming;
export const MARKET_SPARE = market.stock - (market.reserve ?? 0);
export const REORDER = { quantity: 24, leadDays: 10 };
export const STORE_TOTAL = LOCATIONS.reduce((sum, item) => sum + item.stock, 0);
export const DAYS_OF_COVER = Math.round(harbor.stock / (forecastOf(harbor).weekly / 7));

export type StockOption = "transfer" | "reorder";

// Bags on each store's shelf once `moved` bags of the transfer have left Market Square and `landed` have arrived.
export function shelfCounts(moved: number, landed: number) {
  return {
    harbor: harbor.stock + landed,
    market: market.stock - moved,
    riverside: location("riverside").stock,
    transit: moved - landed,
  };
}
