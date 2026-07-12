import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chooseCandidate, scoreCandidate } from "./lib/google-place-matcher.mjs";

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = (name, fallback = null) => {
  const prefix = `--${name}=`;
  return args.find(value => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};

if (flag("help")) {
  console.log(`Usage: GOOGLE_PLACES_API_KEY=... node scripts/sync-google-ratings.mjs [options]\n\n` +
    `  --apply              Update accepted matches in src/data.js (default: report only)\n` +
    `  --id=CAFE_ID         Process one cafe; may be repeated\n` +
    `  --limit=N            Process at most N cafes\n` +
    `  --refresh-place-ids  Ignore cached Place IDs and run Text Search again\n` +
    `  --min-score=0.72     Minimum accepted match score\n` +
    `  --min-margin=0.06    Minimum lead over the second candidate\n` +
    `  --output=PATH        Audit report path\n` +
    `  --usage-log=PATH     Local cumulative API-call counter path\n` +
    `  --key-env=NAME       API-key environment variable (default GOOGLE_PLACES_API_KEY)\n`);
  process.exit(0);
}

const root = path.resolve(option("root", "."));
const dataPath = path.resolve(root, option("data", "src/data.js"));
const reportPath = path.resolve(root, option("output", ".verification/google-ratings-latest.json"));
const placeIdPath = path.resolve(root, option("place-id-cache", ".verification/google-place-ids.json"));
const usagePath = path.resolve(root, option("usage-log", ".verification/google-api-usage.json"));
const keyEnv = option("key-env", "GOOGLE_PLACES_API_KEY");
const apiKey = process.env[keyEnv]?.trim();
if (!apiKey) throw new Error(`Missing ${keyEnv}. Enable Places API (New), then provide the key through this environment variable.`);

const minScore = Number(option("min-score", "0.72"));
const minMargin = Number(option("min-margin", "0.06"));
const limit = Number(option("limit", "0"));
const requestedIds = args.filter(value => value.startsWith("--id=")).map(value => value.slice(5));
const apply = flag("apply");
const refreshPlaceIds = flag("refresh-place-ids");
const dataModule = await import(`${pathToFileURL(dataPath).href}?t=${Date.now()}`);
let selectedCafes = requestedIds.length ? dataModule.cafes.filter(cafe => requestedIds.includes(cafe.id)) : dataModule.cafes;
if (requestedIds.length && selectedCafes.length !== new Set(requestedIds).size) {
  const found = new Set(selectedCafes.map(cafe => cafe.id));
  throw new Error(`Unknown cafe IDs: ${requestedIds.filter(id => !found.has(id)).join(", ")}`);
}
if (limit > 0) selectedCafes = selectedCafes.slice(0, limit);

const cachedPlaceIds = await fs.readFile(placeIdPath, "utf8").then(JSON.parse).catch(() => ({}));
const runDate = new Date().toISOString().slice(0, 10);
const usage = await fs.readFile(usagePath, "utf8").then(JSON.parse).catch(() => ({}));
usage.totalRequests = Number.isInteger(usage.totalRequests) ? usage.totalRequests : 0;
usage.byEndpoint = usage.byEndpoint && typeof usage.byEndpoint === "object" ? usage.byEndpoint : {};
const runUsage = { startedAt: new Date().toISOString(), requests: 0, byEndpoint: {} };

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
      throw new Error(`Google Places HTTP ${response.status}: ${message.slice(0, 300)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 400 * 2 ** (attempt - 1)));
  }
}

const fields = "id,displayName,formattedAddress,location,rating,userRatingCount,googleMapsUri,businessStatus";

async function placeDetails(placeId) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  return googleRequest(url, { method: "GET", headers: { "X-Goog-FieldMask": fields } }, "place-details");
}

async function textSearch(cafe) {
  const body = {
    textQuery: `${cafe.name}, ${cafe.address}`,
    pageSize: 5,
    languageCode: "en",
    regionCode: "US"
  };
  if (Array.isArray(cafe.coords)) {
    body.locationBias = {
      circle: {
        center: { latitude: cafe.coords[0], longitude: cafe.coords[1] },
        radius: 1_500
      }
    };
  }
  const payload = await googleRequest("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "X-Goog-FieldMask": fields.split(",").map(field => `places.${field}`).join(",") },
    body: JSON.stringify(body)
  }, "text-search");
  return payload.places ?? [];
}

const results = [];
for (const [index, cafe] of selectedCafes.entries()) {
  let resolution;
  const cachedId = refreshPlaceIds ? null : cachedPlaceIds[cafe.id];
  try {
    if (cachedId) {
      const candidate = await placeDetails(cachedId);
      const match = scoreCandidate(cafe, candidate);
      resolution = {
        status: match.hardFailures.length || match.score < minScore ? "needs-review" : "matched",
        reasons: [...match.hardFailures, ...(match.score < minScore ? [`score-below-${minScore}`] : [])],
        margin: null,
        selected: { candidate, match },
        candidates: [{ candidate, match }],
        resolution: "cached-place-id"
      };
    } else {
      const candidates = await textSearch(cafe);
      resolution = { ...chooseCandidate(cafe, candidates, { minScore, minMargin }), resolution: "text-search" };
    }
  } catch (error) {
    resolution = { status: "error", reasons: [error.message], selected: null, candidates: [], resolution: cachedId ? "cached-place-id" : "text-search" };
  }

  const place = resolution.selected?.candidate ?? null;
  const accepted = resolution.status === "matched" && Number.isFinite(place?.rating) && Number.isInteger(place?.userRatingCount);
  if (accepted) cachedPlaceIds[cafe.id] = place.id;
  results.push({
    id: cafe.id,
    expectedName: cafe.name,
    expectedAddress: cafe.address,
    previous: { rating: cafe.rating ?? null, ratingCount: cafe.ratingCount ?? null, placeId: cafe.googlePlaceId ?? null },
    status: accepted ? "matched" : resolution.status === "matched" ? "needs-review" : resolution.status,
    reasons: accepted ? resolution.reasons : [...(resolution.reasons ?? []), ...(place && !Number.isFinite(place.rating) ? ["rating-missing"] : []), ...(place && !Number.isInteger(place.userRatingCount) ? ["user-rating-count-missing"] : [])],
    resolution: resolution.resolution,
    match: resolution.selected?.match ?? null,
    margin: resolution.margin ?? null,
    google: place ? {
      placeId: place.id,
      name: place.displayName?.text ?? null,
      address: place.formattedAddress ?? null,
      location: place.location ?? null,
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
      mapsUri: place.googleMapsUri ?? null,
      businessStatus: place.businessStatus ?? null
    } : null,
    delta: accepted ? {
      rating: Number((place.rating - (cafe.rating ?? 0)).toFixed(1)),
      ratingCount: place.userRatingCount - (cafe.ratingCount ?? 0)
    } : null,
    candidates: resolution.candidates?.map(({ candidate, match }) => ({
      placeId: candidate.id,
      name: candidate.displayName?.text ?? null,
      address: candidate.formattedAddress ?? null,
      rating: candidate.rating ?? null,
      ratingCount: candidate.userRatingCount ?? null,
      match
    })) ?? []
  });
  console.log(`${index + 1}/${selectedCafes.length} ${cafe.id}: ${results.at(-1).status}` +
    (accepted ? ` ${place.rating} (${place.userRatingCount}) score=${resolution.selected.match.score}` : ` ${results.at(-1).reasons.join(",")}`));
}

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "Google Places API (New)",
  applied: apply,
  thresholds: { minScore, minMargin },
  summary: {
    total: results.length,
    matched: results.filter(item => item.status === "matched").length,
    needsReview: results.filter(item => item.status === "needs-review").length,
    notFound: results.filter(item => item.status === "not-found").length,
    errors: results.filter(item => item.status === "error").length
  },
  results
}, null, 2)}\n`);
await fs.writeFile(placeIdPath, `${JSON.stringify(cachedPlaceIds, null, 2)}\n`);

if (apply) {
  const acceptedById = new Map(results.filter(item => item.status === "matched").map(item => [item.id, item]));
  const cafes = dataModule.cafes.map(cafe => {
    const result = acceptedById.get(cafe.id);
    if (!result) return cafe;
    return {
      ...cafe,
      rating: result.google.rating,
      ratingCount: result.google.ratingCount,
      ratingSource: result.google.mapsUri || cafe.ratingSource,
      ratingVerifiedAt: runDate,
      googlePlaceId: result.google.placeId
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
  placeIdCache: path.relative(root, placeIdPath),
  applied: apply,
  apiUsage: {
    thisRun: runUsage.requests,
    total: usage.totalRequests,
    byEndpointThisRun: runUsage.byEndpoint,
    localLog: path.relative(root, usagePath)
  },
  total: results.length,
  matched: results.filter(item => item.status === "matched").length,
  needsReview: results.filter(item => item.status === "needs-review").length,
  notFound: results.filter(item => item.status === "not-found").length,
  errors: results.filter(item => item.status === "error").length
};
console.log(JSON.stringify(summary, null, 2));
if (summary.needsReview || summary.notFound || summary.errors) process.exitCode = 2;
