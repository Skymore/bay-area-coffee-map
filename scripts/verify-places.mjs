import fs from "node:fs/promises";
import path from "node:path";
import pw from "/usr/lib/node_modules/playwright/index.js";
import { cafes } from "../src/data.js";

const { chromium } = pw;
const outputDir = path.resolve(".verification");
const outputPath = path.join(outputDir, "google-maps-raw.json");
const existing = await fs.readFile(outputPath, "utf8").then(JSON.parse).catch(() => []);
const byId = new Map(existing.map(item => [item.id, item]));

function streetNumber(address) {
  return address.match(/^\s*(\d+)/)?.[1] ?? "";
}

function compactAddress(address) {
  return address.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function addressMatches(expected, actual) {
  if (!actual) return false;
  const expectedNumber = streetNumber(expected);
  return expectedNumber !== "" && expectedNumber === streetNumber(actual) &&
    compactAddress(actual).includes(compactAddress(expected.split(",")[0]).slice(0, 12));
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: "en-US" });

for (const [index, cafe] of cafes.entries()) {
  if (byId.get(cafe.id)?.verifiedAt === "2026-07-10") continue;
  const query = `${cafe.name}, ${cafe.address}`;
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const result = {
    id: cafe.id,
    expectedName: cafe.name,
    expectedAddress: cafe.address,
    queryUrl: searchUrl,
    verifiedAt: "2026-07-10"
  };

  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.locator("h1").first().waitFor({ timeout: 12_000 });
    await page.waitForTimeout(700);
    result.googleName = (await page.locator("h1").first().textContent())?.trim() ?? null;
    result.googleAddress = await page.locator('[data-item-id="address"]').first().getAttribute("aria-label")
      .then(value => value?.replace(/^Address:\s*/, "").trim() ?? null)
      .catch(() => null);
    result.rating = await page.locator('[aria-label*=" stars"]').first().getAttribute("aria-label")
      .then(value => Number.parseFloat(value))
      .catch(() => null);
    result.photoUrl = await page.locator('button[aria-label^="Photo of "] img').first().getAttribute("src")
      .catch(() => null);
    result.googleMapsUrl = page.url();
    result.addressMatched = addressMatches(cafe.address, result.googleAddress);
    result.status = result.googleName && result.googleAddress && result.rating && result.photoUrl && result.addressMatched
      ? "verified"
      : "needs-review";
  } catch (error) {
    result.status = "error";
    result.error = error.message.split("\n")[0];
  }

  byId.set(cafe.id, result);
  await fs.writeFile(outputPath, `${JSON.stringify([...byId.values()], null, 2)}\n`);
  console.log(`${index + 1}/${cafes.length} ${cafe.id}: ${result.status} ${result.rating ?? "-"}`);
}

await browser.close();
const results = cafes.map(cafe => byId.get(cafe.id));
await fs.writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({
  total: results.length,
  verified: results.filter(item => item.status === "verified").length,
  needsReview: results.filter(item => item.status === "needs-review").length,
  errors: results.filter(item => item.status === "error").length
}, null, 2));
