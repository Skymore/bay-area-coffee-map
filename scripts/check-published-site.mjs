import fs from "node:fs/promises";
import { chromium } from "playwright";
import { photoData } from "../src/photoData.js";

const url = process.argv[2] ?? "https://room.ruit.me/p/coffee/";
const screenshot = process.argv[3] ?? ".checks/published-latest.png";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
const failed = [];
const atlasStatuses = {};
const expectedPhotos = Object.values(photoData).reduce((sum, photos) => sum + photos.length, 0);

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (response) => {
  const atlasName = response.url().match(/cafe-atlas(?:-[a-z0-9]+)?\.jpg/)?.[0];
  if (atlasName) atlasStatuses[atlasName] = response.status();
});
page.on("requestfailed", (request) => {
  const failure = request.failure();
  const resource = request.resourceType();
  if (resource !== "image" && resource !== "fetch") {
    failed.push(`${request.url()} ${failure?.errorText ?? "failed"}`);
  }
});

await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForSelector(".cafe-card", { timeout: 30_000 });

const result = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".cafe-card")];
  const ratingLinks = [...document.querySelectorAll(".rating-count")];
  const photoFrames = [...document.querySelectorAll(".cafe-photo-frame")];
  const parkingBadges = [...document.querySelectorAll(".cafe-card .parking-badge")];
  const atlasFrames = photoFrames.filter((frame) =>
    /cafe-atlas(?:-[a-z0-9]+)?\.jpg/.test(getComputedStyle(frame).backgroundImage)
  );

  return {
    title: document.title,
    cards: cards.length,
    ratingCounts: ratingLinks.length,
    photoFrames: photoFrames.length,
    atlasFrames: atlasFrames.length,
    parkingBadges: parkingBadges.length,
    parkingLevels: [...new Set(parkingBadges.map(badge => badge.textContent.trim()))],
    bodyHas100: document.body.innerText.includes("100"),
    bodyHasGoogleMaps: document.body.innerText.includes("Google Maps")
  };
});

await fs.mkdir(".checks", { recursive: true });
await page.screenshot({ path: screenshot, fullPage: true });
await browser.close();

if (errors.length || failed.length) {
  throw new Error(JSON.stringify({ errors, failed }, null, 2));
}

if (result.cards !== 100) {
  throw new Error(`expected 100 cards, got ${result.cards}`);
}

if (result.ratingCounts !== 100) {
  throw new Error(`expected 100 rating links, got ${result.ratingCounts}`);
}

if (result.parkingBadges !== 100 || result.parkingLevels.length !== 3) {
  throw new Error(`expected 100 parking badges across three levels, got ${result.parkingBadges} / ${result.parkingLevels}`);
}

if (result.photoFrames !== expectedPhotos || result.atlasFrames !== expectedPhotos) {
  throw new Error(`expected ${expectedPhotos} atlas-backed photos, got ${result.atlasFrames}/${result.photoFrames}`);
}

if (Object.keys(atlasStatuses).length !== 6 || Object.values(atlasStatuses).some(status => status !== 200)) {
  throw new Error(`expected six atlas HTTP 200 responses, got ${JSON.stringify(atlasStatuses)}`);
}

console.log(JSON.stringify({ url, screenshot, atlasStatuses, ...result }, null, 2));
