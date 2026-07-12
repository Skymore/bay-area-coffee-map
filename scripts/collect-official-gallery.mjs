import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { cafes } from "../src/data.js";

const outputDir = path.resolve("public/images/gallery");
const manifestPath = path.resolve(".verification/photo-gallery-manifest.json");
const modulePath = path.resolve("src/photoData.js");
const workers = 2;
const maxOfficialPhotos = 2;
const requestedIds = new Set(process.argv.slice(2));
const cafesToCollect = requestedIds.size ? cafes.filter(cafe => requestedIds.has(cafe.id)) : cafes;

const excludedPattern = /(logo|icon|avatar|badge|favicon|sprite|product|packag|coffee.?bag|merch|shirt|hat|mug|gift|menu|bean[s_-]|instagram|facebook|placeholder|payment|award)/i;
const placePattern = /(cafe|café|coffee|shop|location|interior|exterior|storefront|patio|bar|counter|space|street)/i;

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function keywordsFor(cafe) {
  const street = cafe.address.split(",")[0];
  return [...new Set([
    ...normalize(cafe.name).split(" ").filter(word => word.length > 3),
    ...normalize(cafe.neighborhood).split(" ").filter(word => word.length > 2),
    ...normalize(street).split(" ").filter(word => word.length > 3 && !/^\d+$/.test(word))
  ])];
}

function cleanImageUrl(value, baseUrl) {
  if (!value || value.startsWith("data:")) return null;
  try {
    const url = new URL(value, baseUrl);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function scoreCandidate(candidate, cafe) {
  const text = normalize(`${candidate.alt} ${candidate.src} ${candidate.pageUrl}`);
  let score = placePattern.test(text) ? 4 : 0;
  if (excludedPattern.test(text)) score -= 20;
  for (const keyword of keywordsFor(cafe)) {
    if (text.includes(keyword)) score += 3;
  }
  if (candidate.width >= 1000) score += 2;
  if (candidate.width / candidate.height >= 1.3) score += 1;
  return score;
}

async function collectPageImages(page, pageUrl, cafe) {
  await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 12_000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, Math.min(document.body.scrollHeight, 5000)));
  await page.waitForTimeout(350);

  const images = await page.locator("img").evaluateAll(nodes => nodes.map(image => ({
    src: image.currentSrc || image.src || image.dataset.src || "",
    alt: image.alt || "",
    width: image.naturalWidth || image.width || 0,
    height: image.naturalHeight || image.height || 0
  })));

  const candidates = images
    .map(image => ({ ...image, src: cleanImageUrl(image.src, page.url()), pageUrl: page.url() }))
    .filter(image => {
      if (!image.src || image.width < 600 || image.height < 350) return false;
      const ratio = image.width / image.height;
      return ratio >= 1.1 && ratio <= 2.7 && !/\.(svg|gif)(\?|$)/i.test(image.src);
    })
    .map(image => ({ ...image, score: scoreCandidate(image, cafe) }));

  const links = await page.locator("a[href]").evaluateAll(nodes => nodes.map(link => ({
    href: link.href,
    text: `${link.innerText || ""} ${link.getAttribute("aria-label") || ""}`
  })));

  return { candidates, links, finalUrl: page.url() };
}

function relevantInternalLinks(links, originUrl, cafe) {
  const origin = new URL(originUrl);
  const terms = keywordsFor(cafe);

  return links
    .filter(link => {
      try {
        const url = new URL(link.href);
        return url.hostname === origin.hostname && url.pathname !== origin.pathname;
      } catch {
        return false;
      }
    })
    .map(link => {
      const text = normalize(`${link.href} ${link.text}`);
      let score = /location|cafe|visit|store/.test(text) ? 3 : 0;
      for (const term of terms) if (text.includes(term)) score += 4;
      return { ...link, score };
    })
    .filter(link => link.score >= 4)
    .sort((a, b) => b.score - a.score)
    .filter((link, index, all) => all.findIndex(item => item.href === link.href) === index)
    .slice(0, 1);
}

async function downloadCandidate(candidate, destination) {
  const response = await fetch(candidate.src, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; BayAreaCoffeeMap/1.0)",
      referer: candidate.pageUrl
    },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`image HTTP ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(input, { failOn: "none" }).metadata();
  if ((metadata.width || 0) < 600 || (metadata.height || 0) < 350) throw new Error("image too small");
  await sharp(input, { failOn: "none" })
    .rotate()
    .resize(960, 600, { fit: "cover", position: "attention" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(destination);
}

async function collectCafe(page, cafe) {
  const gathered = [];
  let links = [];
  let firstDownloadError = null;

  try {
    const first = await collectPageImages(page, cafe.website, cafe);
    gathered.push(...first.candidates);
    links = relevantInternalLinks(first.links, first.finalUrl, cafe);
  } catch (error) {
    return { cafe, photos: [], error: error.message.split("\n")[0] };
  }

  for (const link of links) {
    try {
      const result = await collectPageImages(page, link.href, cafe);
      gathered.push(...result.candidates);
    } catch {
      // Keep candidates from the primary page when an optional location page fails.
    }
  }

  const unique = gathered
    .sort((a, b) => b.score - a.score || b.width - a.width)
    .filter(candidate => candidate.score > -10)
    .filter((candidate, index, all) => {
      const key = new URL(candidate.src).pathname.replace(/[-_]\d+x\d+(?=\.)/, "");
      return all.findIndex(item => new URL(item.src).pathname.replace(/[-_]\d+x\d+(?=\.)/, "") === key) === index;
    });

  const photos = [];
  for (const candidate of unique) {
    if (photos.length >= maxOfficialPhotos) break;
    const slot = photos.length + 2;
    const filename = `${cafe.id}-${slot}.jpg`;
    try {
      await downloadCandidate(candidate, path.join(outputDir, filename));
      photos.push({
        file: `images/gallery/${filename}`,
        credit: "门店官网",
        source: candidate.pageUrl,
        original: candidate.src,
        alt: candidate.alt,
        score: candidate.score
      });
    } catch (error) {
      firstDownloadError ||= error.message.split("\n")[0];
      // Try the next candidate.
    }
  }

  return { cafe, photos, candidateCount: unique.length, firstDownloadError };
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const queue = [...cafesToCollect];
const results = [];

await Promise.all(Array.from({ length: workers }, async (_, workerIndex) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: "en-US" });
  while (queue.length) {
    const cafe = queue.shift();
    const result = await collectCafe(page, cafe);
    results.push(result);
    console.log(`${results.length}/${cafesToCollect.length} worker ${workerIndex + 1}: ${cafe.id} +${result.photos.length} (${result.candidateCount || 0} candidates${result.firstDownloadError ? `; ${result.firstDownloadError}` : ""})`);
  }
  await page.close();
}));

await browser.close();
results.sort((a, b) => cafes.findIndex(cafe => cafe.id === a.cafe.id) - cafes.findIndex(cafe => cafe.id === b.cafe.id));

const photoData = Object.fromEntries(results.map(({ cafe, photos }) => [
  cafe.id,
  [
    {
      file: `images/cafes/${cafe.id}.jpg`,
      credit: cafe.imageCredit || "Google Maps 门店页",
      source: cafe.imageSource || cafe.ratingSource
    },
    ...photos.map(({ file, credit, source }) => ({ file, credit, source }))
  ]
]));

const moduleSource = `export const photoData = ${JSON.stringify(photoData, null, 2)};\n`;
await fs.writeFile(modulePath, moduleSource);
await fs.writeFile(manifestPath, `${JSON.stringify(results.map(({ cafe, photos, error }) => ({
  id: cafe.id,
  name: cafe.name,
  website: cafe.website,
  photos,
  error: error || null
})), null, 2)}\n`);

console.log(JSON.stringify({
  cafes: results.length,
  officialPhotos: results.reduce((sum, result) => sum + result.photos.length, 0),
  cafesWithThreeOrMore: results.filter(result => result.photos.length >= 2).length,
  cafesWithOfficialPhoto: results.filter(result => result.photos.length > 0).length
}, null, 2));
