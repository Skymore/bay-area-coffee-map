import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { cafes } from "../src/data.js";
import { photoData as existingPhotoData } from "../src/photoData.js";

const outputDir = path.resolve("public/images/gallery");
const modulePath = path.resolve("src/photoData.js");
const manifestPath = path.resolve(".verification/search-gallery-manifest.json");
const targetPhotosPerCafe = 3;
const rejectedFiles = new Set([
  "images/gallery/andytown-2.jpg",
  "images/gallery/andytown-3.jpg",
  "images/gallery/coffee-water-lab-2.jpg",
  "images/gallery/coffee-water-lab-3.jpg",
  "images/gallery/coro-2.jpg",
  "images/gallery/equator-sausalito-2.jpg",
  "images/gallery/linea-potrero-2.jpg",
  "images/gallery/mother-tongue-3.jpg",
  "images/gallery/red-rock-2.jpg",
  "images/gallery/red-whale-2.jpg",
  "images/gallery/reveille-north-beach-2.jpg",
  "images/gallery/reveille-north-beach-3.jpg",
  "images/gallery/sightglass-3.jpg"
]);
const excludedPattern = /(logo|icon|avatar|product|packag|coffee.?bag|merch|shirt|hat|mug|gift|menu|bean[s_-]|certificate|award|illustration|vector|clipart|rule34|adult|pinterest)/i;
const sourceLabels = new Map([
  ["yelp.com", "Yelp 门店页"],
  ["tripadvisor.com", "Tripadvisor 门店页"],
  ["roastersmap.com", "Roasters Map"],
  ["sfgate.com", "SFGATE"],
  ["sfchronicle.com", "San Francisco Chronicle"],
  ["sfstandard.com", "The San Francisco Standard"],
  ["eater.com", "Eater"],
  ["berkeleyside.org", "Berkeleyside"],
  ["mercurynews.com", "The Mercury News"],
  ["cntraveler.com", "Condé Nast Traveler"],
  ["visitoakland.com", "Visit Oakland"]
]);

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function distinctiveTerms(cafe) {
  const ignored = new Set(["coffee", "coffees", "cafe", "company", "roaster", "roasters", "the", "and", "bar"]);
  return normalize(cafe.name).split(" ").filter(term => term.length >= 4 && !ignored.has(term));
}

function isRelevant(result, cafe) {
  const text = normalize(`${result.title} ${result.url} ${result.image}`);
  const terms = distinctiveTerms(cafe);
  return terms.length ? terms.some(term => text.includes(term)) : text.includes(normalize(cafe.name));
}

function sourceLabel(sourceUrl) {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    for (const [domain, label] of sourceLabels) if (host === domain || host.endsWith(`.${domain}`)) return label;
    return host;
  } catch {
    return "图片来源页";
  }
}

async function imageSearch(query) {
  const searchPage = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(12_000)
  });
  const html = await searchPage.text();
  const vqd = html.match(/vqd=['\"]([^'\"]+)/)?.[1] || html.match(/vqd=([\d-]+)/)?.[1];
  if (!vqd) return [];

  const response = await fetch(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,&p=1`,
    {
      headers: { "user-agent": "Mozilla/5.0", referer: "https://duckduckgo.com/" },
      signal: AbortSignal.timeout(12_000)
    }
  );
  if (!response.ok) return [];
  return (await response.json()).results || [];
}

async function saveImage(candidate, destination) {
  const response = await fetch(candidate.image, {
    headers: { "user-agent": "Mozilla/5.0", referer: candidate.url },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(input, { failOn: "none" }).metadata();
  if ((metadata.width || 0) < 500 || (metadata.height || 0) < 320) throw new Error("too small");
  const ratio = metadata.width / metadata.height;
  if (ratio < 0.95 || ratio > 2.8) throw new Error("bad ratio");
  await sharp(input, { failOn: "none" })
    .rotate()
    .resize(960, 600, { fit: "cover", position: "attention" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(destination);
}

await fs.mkdir(outputDir, { recursive: true });
const photoData = structuredClone(existingPhotoData);

for (const photos of Object.values(photoData)) {
  for (const photo of photos) {
    if (!rejectedFiles.has(photo.file)) continue;
    await fs.rm(path.resolve("public", photo.file), { force: true });
  }
}

const manifest = [];
for (const [index, cafe] of cafes.entries()) {
  const current = (photoData[cafe.id] || []).filter(photo => !rejectedFiles.has(photo.file));
  photoData[cafe.id] = current;
  const needed = Math.max(0, targetPhotosPerCafe - current.length);
  if (!needed) {
    manifest.push({ id: cafe.id, added: [] });
    console.log(`${index + 1}/${cafes.length} ${cafe.id}: already ${current.length}`);
    continue;
  }

  const street = cafe.address.split(",")[0];
  const query = `"${cafe.name}" "${street}" ${cafe.city} interior exterior cafe`;
  let results = [];
  try {
    results = await imageSearch(query);
  } catch {
    // Leave this cafe with its verified existing images if search is unavailable.
  }

  let candidates = results
    .filter(result => result.image && result.url && isRelevant(result, cafe))
    .filter(result => !excludedPattern.test(`${result.image} ${result.url} ${result.title}`))
    .filter(result => Number(result.width || 0) >= 500 && Number(result.height || 0) >= 320)
    .filter((result, resultIndex, all) => all.findIndex(item => item.image === result.image) === resultIndex);

  if (candidates.length < needed) {
    try {
      const fallbackResults = await imageSearch(`${cafe.name} ${cafe.city} California cafe photos`);
      candidates = [...candidates, ...fallbackResults
        .filter(result => result.image && result.url && isRelevant(result, cafe))
        .filter(result => !excludedPattern.test(`${result.image} ${result.url} ${result.title}`))
        .filter(result => Number(result.width || 0) >= 450 && Number(result.height || 0) >= 300)]
        .filter((result, resultIndex, all) => all.findIndex(item => item.image === result.image) === resultIndex);
    } catch {
      // Keep the exact-address results.
    }
  }

  const added = [];
  for (const candidate of candidates) {
    if (added.length >= needed) break;
    const slot = current.length + added.length + 1;
    const filename = `${cafe.id}-search-${slot}.jpg`;
    try {
      await saveImage(candidate, path.join(outputDir, filename));
      const photo = {
        file: `images/gallery/${filename}`,
        credit: sourceLabel(candidate.url),
        source: candidate.url
      };
      current.push(photo);
      added.push({ ...photo, original: candidate.image, title: candidate.title });
    } catch {
      // Try the next search result.
    }
  }

  manifest.push({ id: cafe.id, query, candidateCount: candidates.length, added });
  console.log(`${index + 1}/${cafes.length} ${cafe.id}: +${added.length}, total ${current.length}`);
  await new Promise(resolve => setTimeout(resolve, 180));
}

await fs.writeFile(modulePath, `export const photoData = ${JSON.stringify(photoData, null, 2)};\n`);
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  cafes: cafes.length,
  photos: Object.values(photoData).reduce((sum, photos) => sum + photos.length, 0),
  cafesWithThree: Object.values(photoData).filter(photos => photos.length >= 3).length,
  cafesWithMultiple: Object.values(photoData).filter(photos => photos.length > 1).length
}, null, 2));
