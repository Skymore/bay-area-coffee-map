import fs from "node:fs/promises";
import path from "node:path";
import pw from "/usr/lib/node_modules/playwright/index.js";
import { cafes } from "../src/data.js";

const { chromium } = pw;
const removedIds = new Set([
  "philz-mint", "southeast-coffee", "hazel-oakland", "blue-bottle-west-loop",
  "warm-coffee-bar", "saint-frank-russian-hill", "equator-tiburon", "prosperity-sf",
  "andante-oakland", "mile-kava-berkeley", "coupa-4th", "peets-marin",
  "flywheel-san-jose"
]);

const overrides = {
  artis: { address: "1717 Fourth St B, Berkeley, CA 94710" },
  "highwire-rockridge": { address: "5615 College Ave, Oakland, CA 94618" },
  bartavelle: { name: "Bartavelle", address: "1621 San Pablo Ave, Berkeley, CA 94702" },
  academic: { address: "499 S Second St, San Jose, CA 95113" },
  voyager: { address: "111 W St John St Ste 100, San Jose, CA 95113" },
  "blue-bottle-mint": { address: "66 Mint St, San Francisco, CA 94103" },
  "mr-espresso": { name: "The Caffè by Mr. Espresso", address: "1120 Broadway, Oakland, CA 94607" },
  "grand-coffee": { address: "2663 Mission St, San Francisco, CA 94110" },
  "verve-mission": { address: "2101 Market St, San Francisco, CA 94114" }
};

const direct = JSON.parse(await fs.readFile(".verification/google-maps-raw.json", "utf8"));
const directById = new Map(direct.map(item => [item.id, item]));
const outPath = path.resolve(".verification/current-place-snapshots.json");
const existing = await fs.readFile(outPath, "utf8").then(JSON.parse).catch(() => []);
const byId = new Map(existing.map(item => [item.id, item]));

function norm(value) {
  return value.toLowerCase()
    .replace(/fourth/g, "4th").replace(/second/g, "2nd")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function streetKey(address) {
  const first = norm(address.split(",")[0]);
  const tokens = first.split(" ").filter(token => !["suite", "ste", "unit", "b"].includes(token));
  return { number: tokens[0], word: tokens.find((token, index) => index > 0 && !/^(w|e|n|s|st|street|ave|avenue|blvd|road|rd)$/.test(token)) };
}

function cardMatches(text, address) {
  const key = streetKey(address);
  const candidate = norm(text);
  return candidate.includes(` ${key.number} `) && candidate.includes(key.word);
}

function parseCard(text) {
  const match = text.match(/([1-5]\.\d)\s*\(([\d,]+)\)/);
  return match ? { rating: Number(match[1]), ratingCount: Number(match[2].replaceAll(",", "")) } : {};
}

function coordsFromUrl(url) {
  const match = url?.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

await fs.mkdir(".verification", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "en-US" });
const liveCafes = cafes.filter(cafe => !removedIds.has(cafe.id));

for (const [index, original] of liveCafes.entries()) {
  if (byId.get(original.id)?.status === "verified") continue;
  const cafe = { ...original, ...overrides[original.id] };
  const result = { id: cafe.id, name: cafe.name, address: cafe.address, verifiedAt: "2026-07-10" };
  try {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cafe.name} ${cafe.city}`)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(850);
    const cards = await page.locator('a[aria-label]').evaluateAll(links => links.map(link => ({
      name: link.getAttribute("aria-label"),
      href: link.href,
      text: link.parentElement?.innerText ?? "",
      photoUrl: link.parentElement?.querySelector("img")?.src ?? null
    })).filter(item => item.href.includes("/maps/place/")));
    const card = cards.find(item => cardMatches(item.text, cafe.address));
    const fallback = directById.get(cafe.id);
    if (card) {
      const parsed = parseCard(card.text);
      Object.assign(result, {
        rating: parsed.rating ?? fallback?.rating ?? null,
        ratingCount: parsed.ratingCount ?? null,
        googleName: card.name,
        googleMapsUrl: card.href,
        photoUrl: card.photoUrl ?? fallback?.photoUrl ?? null,
        coords: coordsFromUrl(card.href)
      });
    } else if (fallback?.rating && fallback?.photoUrl && (fallback.addressMatched || overrides[cafe.id])) {
      Object.assign(result, {
        rating: fallback.rating,
        ratingCount: null,
        googleName: fallback.googleName,
        googleMapsUrl: fallback.googleMapsUrl,
        photoUrl: fallback.photoUrl,
        coords: coordsFromUrl(fallback.googleMapsUrl)
      });
    }
    if (!result.rating || !result.photoUrl) {
      const exactUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cafe.name}, ${cafe.address}`)}`;
      await page.goto(exactUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(850);
      const exactAddress = await page.locator('[data-item-id="address"]').first().getAttribute("aria-label").catch(() => null);
      if (exactAddress && cardMatches(exactAddress, cafe.address)) {
        const mapUrl = page.url();
        Object.assign(result, {
          rating: await page.locator('[aria-label*=" stars"]').first().getAttribute("aria-label").then(Number.parseFloat).catch(() => null),
          ratingCount: result.ratingCount ?? null,
          googleName: await page.locator("h1").last().textContent().then(value => value?.trim()).catch(() => cafe.name),
          googleMapsUrl: mapUrl,
          photoUrl: await page.locator('button[aria-label^="Photo of "] img').first().getAttribute("src").catch(() => null),
          coords: coordsFromUrl(mapUrl)
        });
      }
    }
    result.status = result.rating && result.photoUrl && result.googleMapsUrl ? "verified" : "needs-review";
  } catch (error) {
    result.status = "error";
    result.error = error.message.split("\n")[0];
  }
  byId.set(cafe.id, result);
  await fs.writeFile(outPath, `${JSON.stringify([...byId.values()], null, 2)}\n`);
  console.log(`${index + 1}/${liveCafes.length} ${cafe.id}: ${result.status} ${result.rating ?? "-"} (${result.ratingCount ?? "?"})`);
}

await browser.close();
const results = liveCafes.map(cafe => byId.get(cafe.id));
await fs.writeFile(outPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({
  total: results.length,
  verified: results.filter(item => item.status === "verified").length,
  needsReview: results.filter(item => item.status !== "verified").map(item => item.id)
}, null, 2));
