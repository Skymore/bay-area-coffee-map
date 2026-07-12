import fs from "node:fs/promises";
import pw from "/usr/lib/node_modules/playwright/index.js";

const { chromium } = pw;
const queries = [
  "coffee shops San Francisco CA",
  "coffee roasters San Francisco CA",
  "coffee shops Oakland CA",
  "coffee shops Berkeley CA",
  "coffee shops Alameda CA",
  "coffee shops San Jose CA",
  "coffee shops Santa Clara CA",
  "coffee shops Palo Alto CA",
  "coffee shops Mountain View CA",
  "coffee shops San Mateo CA",
  "coffee shops Redwood City CA",
  "coffee shops Fremont CA",
  "coffee shops Marin County CA",
  "coffee shops Sausalito CA",
  "coffee shops Walnut Creek CA"
];

function walk(value, visit) {
  if (!Array.isArray(value)) return;
  visit(value);
  for (const child of value) walk(child, visit);
}

function imageFromPlace(place) {
  const photos = place[72]?.[0];
  if (!Array.isArray(photos)) return null;
  for (const photo of photos) {
    const url = photo?.[6]?.[0];
    if (typeof url === "string" && url.startsWith("https://lh3.googleusercontent.com/")) {
      return url.replace(/=w\d+-h\d+-k-no$/, "=w1200-h900-k-no");
    }
  }
  return null;
}

function parsePayload(text, query, sourceUrl) {
  const json = text.replace(/^\)\]\}'\n/, "");
  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    return [];
  }
  const results = [];
  walk(payload, place => {
    const name = place[11];
    const placeId = place[10];
    const rating = place[4]?.[7];
    const ratingCount = place[37]?.[1];
    const latitude = place[9]?.[2];
    const longitude = place[9]?.[3];
    const address = place[39] ?? place[18];
    if (
      place.length < 180 || typeof name !== "string" || typeof placeId !== "string" ||
      typeof rating !== "number" || typeof ratingCount !== "number" ||
      typeof latitude !== "number" || typeof longitude !== "number" ||
      typeof address !== "string"
    ) return;
    const imageUrl = imageFromPlace(place);
    if (!imageUrl) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}`;
    results.push({
      placeId,
      name,
      rating,
      ratingCount,
      address,
      coords: [latitude, longitude],
      categories: Array.isArray(place[13]) ? place[13] : [],
      neighborhood: typeof place[14] === "string" ? place[14] : null,
      website: place[7]?.[0] ?? null,
      phone: place[178]?.[0]?.[0] ?? null,
      imageUrl,
      googleMapsUrl: mapsUrl,
      query,
      evidenceUrl: sourceUrl
    });
  });
  return results;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 }, locale: "en-US" });
const byPlaceId = new Map();
let activeQuery = null;
let pending = [];

page.on("response", response => {
  if (!response.url().includes("/search?tbm=map")) return;
  const query = activeQuery;
  pending.push((async () => {
    try {
      const text = await response.text();
      for (const candidate of parsePayload(text, query, response.url())) {
        const previous = byPlaceId.get(candidate.placeId);
        if (!previous || candidate.ratingCount > previous.ratingCount) {
          byPlaceId.set(candidate.placeId, candidate);
        }
      }
    } catch {
      // A navigation can cancel a response; later result pages still provide the data.
    }
  })());
});

for (const [index, query] of queries.entries()) {
  activeQuery = query;
  const before = byPlaceId.size;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(700);
  const feed = page.locator('[role="feed"]').first();
  if (await feed.count()) {
    for (let turn = 0; turn < 9; turn += 1) {
      try {
        await feed.evaluate(element => element.scrollTo(0, element.scrollHeight), undefined, { timeout: 5_000 });
      } catch {
        break;
      }
      await page.waitForTimeout(350);
    }
  }
  await Promise.allSettled(pending);
  pending = [];
  await fs.writeFile(".verification/google-maps-candidate-pool.json", `${JSON.stringify([...byPlaceId.values()], null, 2)}\n`);
  console.log(`${index + 1}/${queries.length} ${query}: +${byPlaceId.size - before}, ${byPlaceId.size} unique places`);
}

await Promise.allSettled(pending);
await browser.close();
const candidates = [...byPlaceId.values()].sort((a, b) =>
  b.ratingCount - a.ratingCount || b.rating - a.rating || a.name.localeCompare(b.name)
);
await fs.writeFile(".verification/google-maps-candidate-pool.json", `${JSON.stringify(candidates, null, 2)}\n`);
console.log(JSON.stringify({
  total: candidates.length,
  eligible: candidates.filter(candidate => candidate.rating >= 4.3 && candidate.ratingCount >= 50).length,
  top: candidates.slice(0, 10).map(({ name, rating, ratingCount }) => ({ name, rating, ratingCount }))
}, null, 2));
