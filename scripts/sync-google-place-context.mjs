import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chooseCandidate } from "./lib/google-place-matcher.mjs";

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = (name, fallback = null) => {
  const prefix = `--${name}=`;
  return args.find(value => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};

if (flag("help")) {
  console.log(`Usage: GOOGLE_PLACES_API_KEY=... node scripts/sync-google-place-context.mjs [options]\n\n` +
    `  --apply              Update src/data.js (default: report only)\n` +
    `  --nearby-only        Reuse saved opening hours and only refresh nearby places\n` +
    `  --id=CAFE_ID         Process one cafe; may be repeated\n` +
    `  --limit=N            Process at most N cafes\n` +
    `  --radius=1200        Nearby Search radius in meters\n` +
    `  --output=PATH        Audit report path\n` +
    `  --usage-log=PATH     Local cumulative API-call counter path\n` +
    `  --key-env=NAME       API-key environment variable\n`);
  process.exit(0);
}

const root = path.resolve(option("root", "."));
const dataPath = path.resolve(root, option("data", "src/data.js"));
const reportPath = path.resolve(root, option("output", ".verification/google-place-context-latest.json"));
const usagePath = path.resolve(root, option("usage-log", ".verification/google-api-usage.json"));
const keyEnv = option("key-env", "GOOGLE_PLACES_API_KEY");
const apiKey = process.env[keyEnv]?.trim();
if (!apiKey) throw new Error(`Missing ${keyEnv}`);

const radiusMeters = Number(option("radius", "1200"));
if (!Number.isFinite(radiusMeters) || radiusMeters <= 0 || radiusMeters > 50_000) {
  throw new Error("--radius must be between 1 and 50000 meters");
}
const limit = Number(option("limit", "0"));
const requestedIds = args.filter(value => value.startsWith("--id=")).map(value => value.slice(5));
const apply = flag("apply");
const nearbyOnly = flag("nearby-only");
const dataModule = await import(`${pathToFileURL(dataPath).href}?t=${Date.now()}`);
let selectedCafes = requestedIds.length ? dataModule.cafes.filter(cafe => requestedIds.includes(cafe.id)) : dataModule.cafes;
if (requestedIds.length && selectedCafes.length !== new Set(requestedIds).size) {
  const found = new Set(selectedCafes.map(cafe => cafe.id));
  throw new Error(`Unknown cafe IDs: ${requestedIds.filter(id => !found.has(id)).join(", ")}`);
}
if (limit > 0) selectedCafes = selectedCafes.slice(0, limit);

const runDate = new Date().toISOString().slice(0, 10);
const usage = await fs.readFile(usagePath, "utf8").then(JSON.parse).catch(() => ({}));
usage.totalRequests = Number.isInteger(usage.totalRequests) ? usage.totalRequests : 0;
usage.byEndpoint = usage.byEndpoint && typeof usage.byEndpoint === "object" ? usage.byEndpoint : {};
const runUsage = { requests: 0, byEndpoint: {} };

async function recordGoogleCall(endpoint) {
  usage.totalRequests += 1;
  usage.byEndpoint[endpoint] = (usage.byEndpoint[endpoint] ?? 0) + 1;
  usage.updatedAt = new Date().toISOString();
  runUsage.requests += 1;
  runUsage.byEndpoint[endpoint] = (runUsage.byEndpoint[endpoint] ?? 0) + 1;
  await fs.mkdir(path.dirname(usagePath), { recursive: true });
  await fs.writeFile(usagePath, `${JSON.stringify(usage, null, 2)}\n`);
}

async function googleRequest(url, init, endpoint, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          ...init?.headers
        }
      });
    } finally {
      await recordGoogleCall(endpoint);
    }
    if (response.ok) return response.json();
    const message = await response.text();
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === attempts) {
      throw new Error(`Google Places HTTP ${response.status}: ${message.slice(0, 500)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 400 * 2 ** (attempt - 1)));
  }
}

const detailFields = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "businessStatus",
  "regularOpeningHours",
  "utcOffsetMinutes"
].join(",");

async function placeDetails(placeId) {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "zh-CN");
  url.searchParams.set("regionCode", "US");
  return googleRequest(url, {
    method: "GET",
    headers: { "X-Goog-FieldMask": detailFields }
  }, "place-context-details");
}

async function resolvePlace(cafe) {
  if (cafe.googlePlaceId) return placeDetails(cafe.googlePlaceId);
  if (cafe.placeBusinessStatus === "CLOSED_PERMANENTLY") {
    return { id: null, businessStatus: "CLOSED_PERMANENTLY" };
  }

  const searchFields = "id,displayName,formattedAddress,location,businessStatus";
  const payload = await googleRequest("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "X-Goog-FieldMask": searchFields.split(",").map(field => `places.${field}`).join(",") },
    body: JSON.stringify({
      textQuery: `${cafe.name}, ${cafe.address}`,
      pageSize: 5,
      languageCode: "en",
      regionCode: "US",
      locationBias: {
        circle: {
          center: { latitude: cafe.coords[0], longitude: cafe.coords[1] },
          radius: 1_500
        }
      }
    })
  }, "place-context-text-search");
  const resolution = chooseCandidate(cafe, payload.places ?? [], { minScore: 0.62, minMargin: 0.04 });
  if (resolution.status !== "matched" || !resolution.selected?.candidate?.id) {
    throw new Error(`Place ID unresolved: ${(resolution.reasons ?? []).join(", ") || "no accepted match"}`);
  }
  return placeDetails(resolution.selected.candidate.id);
}

const groceryTypes = new Set(["grocery_store", "supermarket", "convenience_store"]);
const transitTypes = new Set([
  "bus_station",
  "bus_stop",
  "ferry_terminal",
  "light_rail_station",
  "subway_station",
  "train_station",
  "tram_stop",
  "transit_depot",
  "transit_station",
  "transit_stop"
]);
const gasTypes = new Set(["gas_station"]);
const schoolTypes = new Set(["school", "primary_school", "secondary_school", "university"]);
const attractionTypes = new Set(["tourist_attraction", "museum", "park"]);
const categoryRules = [
  ["gas", gasTypes],
  ["school", schoolTypes],
  ["attraction", attractionTypes],
  ["grocery", groceryTypes],
  ["transit", transitTypes]
];
const nearbyTypes = [...new Set(categoryRules.flatMap(([, types]) => [...types]))];

function standardMapsUrl(place) {
  const params = new URLSearchParams({
    api: "1",
    query: [place.displayName?.text, place.shortFormattedAddress].filter(Boolean).join(", ") ||
      `${place.location.latitude},${place.location.longitude}`
  });
  if (place.id) params.set("query_place_id", place.id);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function distanceMeters(origin, destination) {
  const toRad = value => (value * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLng = toRad(destination.longitude - origin.longitude);
  const lat1 = toRad(origin.latitude);
  const lat2 = toRad(destination.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function searchNearby(cafe) {
  const payload = await googleRequest("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.primaryType",
        "places.types",
        "places.shortFormattedAddress",
        "places.location",
        "places.businessStatus"
      ].join(",")
    },
    body: JSON.stringify({
      includedTypes: nearbyTypes,
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      languageCode: "zh-CN",
      regionCode: "US",
      locationRestriction: {
        circle: {
          center: { latitude: cafe.coords[0], longitude: cafe.coords[1] },
          radius: radiusMeters
        }
      }
    })
  }, "nearby-search");

  const origin = { latitude: cafe.coords[0], longitude: cafe.coords[1] };
  return (payload.places ?? [])
    .filter(place => place.businessStatus !== "CLOSED_PERMANENTLY" && place.location)
    .map(place => {
      const types = place.types ?? [];
      const category = categoryRules.find(([, categoryTypes]) => categoryTypes.has(place.primaryType))?.[0] ??
        categoryRules.find(([, categoryTypes]) => types.some(type => categoryTypes.has(type)))?.[0] ?? null;
      return {
        id: place.id,
        name: place.displayName?.text ?? "附近地点",
        category,
        primaryType: place.primaryType ?? null,
        address: place.shortFormattedAddress ?? null,
        coords: [place.location.latitude, place.location.longitude],
        distanceMeters: distanceMeters(origin, place.location),
        mapsUri: standardMapsUrl(place)
      };
    })
    .filter(place => place.category)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

function dedupeNearby(places, limit) {
  const selected = [];
  for (const place of places) {
    const normalizedName = place.name.toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
    const duplicate = selected.some(item =>
      item.normalizedName === normalizedName && Math.abs(item.place.distanceMeters - place.distanceMeters) <= 100
    );
    if (duplicate) continue;
    selected.push({ normalizedName, place });
    if (selected.length >= limit) break;
  }
  return selected.map(item => item.place);
}

const results = [];
for (const [index, cafe] of selectedCafes.entries()) {
  let details = null;
  let nearby = [];
  const errors = [];
  try {
    details = nearbyOnly ? {
      id: cafe.googlePlaceId,
      businessStatus: cafe.placeBusinessStatus,
      regularOpeningHours: cafe.regularOpeningHours,
      utcOffsetMinutes: cafe.utcOffsetMinutes
    } : await resolvePlace(cafe);
  } catch (error) {
    errors.push(`details: ${error.message}`);
  }
  try {
    nearby = await searchNearby(cafe);
  } catch (error) {
    errors.push(`nearby: ${error.message}`);
  }

  const groceries = dedupeNearby(nearby.filter(place => place.category === "grocery"), 5);
  const transit = dedupeNearby(nearby.filter(place => place.category === "transit"), 6);
  const gasStations = dedupeNearby(nearby.filter(place => place.category === "gas"), 3);
  const schools = dedupeNearby(nearby.filter(place => place.category === "school"), 3);
  const attractions = dedupeNearby(nearby.filter(place => place.category === "attraction"), 5);
  const result = {
    id: cafe.id,
    placeId: details?.id ?? cafe.googlePlaceId ?? null,
    businessStatus: details?.businessStatus ?? cafe.placeBusinessStatus ?? null,
    regularOpeningHours: details?.regularOpeningHours ?? null,
    utcOffsetMinutes: details?.utcOffsetMinutes ?? null,
    nearbyPlaces: {
      radiusMeters,
      verifiedAt: runDate,
      groceries,
      transit,
      gasStations,
      schools,
      attractions
    },
    errors
  };
  results.push(result);
  console.log(`${index + 1}/${selectedCafes.length} ${cafe.id}: hours=${result.regularOpeningHours ? "yes" : "no"}` +
    ` grocery=${groceries.length} transit=${transit.length} gas=${gasStations.length}` +
    ` school=${schools.length} attraction=${attractions.length}` +
    (errors.length ? ` errors=${errors.join(" | ")}` : ""));
}

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "Google Places API (New)",
  applied: apply,
  radiusMeters,
  apiUsage: runUsage,
  summary: {
    total: results.length,
    withHours: results.filter(item => item.regularOpeningHours).length,
    withGroceries: results.filter(item => item.nearbyPlaces.groceries.length).length,
    withTransit: results.filter(item => item.nearbyPlaces.transit.length).length,
    withGasStations: results.filter(item => item.nearbyPlaces.gasStations.length).length,
    withSchools: results.filter(item => item.nearbyPlaces.schools.length).length,
    withAttractions: results.filter(item => item.nearbyPlaces.attractions.length).length,
    errors: results.filter(item => item.errors.length).length
  },
  results
}, null, 2)}\n`);

if (apply) {
  const resultById = new Map(results.map(result => [result.id, result]));
  const cafes = dataModule.cafes.map(cafe => {
    const result = resultById.get(cafe.id);
    if (!result) return cafe;
    return {
      ...cafe,
      googlePlaceId: result.placeId || cafe.googlePlaceId,
      placeBusinessStatus: result.businessStatus,
      regularOpeningHours: result.regularOpeningHours,
      utcOffsetMinutes: result.utcOffsetMinutes,
      nearbyPlaces: result.nearbyPlaces
    };
  });
  const js = `export const dataUpdatedAt = ${JSON.stringify(runDate)};\n\n` +
    `export const cafes = ${JSON.stringify(cafes, null, 2)};\n\n` +
    `export const regionOptions = ${JSON.stringify(dataModule.regionOptions, null, 2)};\n\n` +
    `export const tagOptions = ${JSON.stringify(dataModule.tagOptions, null, 2)};\n\n` +
    `export const routes = ${JSON.stringify(dataModule.routes, null, 2)};\n`;
  await fs.writeFile(dataPath, js);
}

const summary = {
  report: path.relative(root, reportPath),
  applied: apply,
  apiUsage: runUsage,
  total: results.length,
  withHours: results.filter(item => item.regularOpeningHours).length,
  withGroceries: results.filter(item => item.nearbyPlaces.groceries.length).length,
  withTransit: results.filter(item => item.nearbyPlaces.transit.length).length,
  withGasStations: results.filter(item => item.nearbyPlaces.gasStations.length).length,
  withSchools: results.filter(item => item.nearbyPlaces.schools.length).length,
  withAttractions: results.filter(item => item.nearbyPlaces.attractions.length).length,
  errors: results.filter(item => item.errors.length).length
};
console.log(JSON.stringify(summary, null, 2));
if (summary.errors) process.exitCode = 2;
