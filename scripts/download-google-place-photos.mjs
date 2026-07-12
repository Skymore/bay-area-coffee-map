import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { cafes } from "../src/data.js";

const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is required");

const usagePath = path.resolve(".verification/google-api-usage.json");
const usage = await fs.readFile(usagePath, "utf8").then(JSON.parse).catch(() => ({}));
usage.totalRequests = Number.isInteger(usage.totalRequests) ? usage.totalRequests : 0;
usage.byEndpoint = usage.byEndpoint && typeof usage.byEndpoint === "object" ? usage.byEndpoint : {};

async function trackedFetch(url, init, endpoint) {
  let response;
  try {
    response = await fetch(url, init);
    return response;
  } finally {
    usage.totalRequests += 1;
    usage.byEndpoint[endpoint] = (usage.byEndpoint[endpoint] ?? 0) + 1;
    usage.updatedAt = new Date().toISOString();
    await fs.mkdir(path.dirname(usagePath), { recursive: true });
    await fs.writeFile(usagePath, `${JSON.stringify(usage, null, 2)}\n`);
  }
}

const ids = process.argv.slice(2).filter(arg => arg.startsWith("--id=")).map(arg => arg.slice(5));
if (!ids.length) throw new Error("Pass at least one --id=CAFE_ID");

const cafeById = new Map(cafes.map(cafe => [cafe.id, cafe]));
const primaryDir = path.resolve("public/images/cafes");
const galleryDir = path.resolve("public/images/gallery");
await fs.mkdir(primaryDir, { recursive: true });
await fs.mkdir(galleryDir, { recursive: true });

for (const id of ids) {
  const cafe = cafeById.get(id);
  if (!cafe?.googlePlaceId) throw new Error(`${id}: cafe or googlePlaceId not found`);

  const response = await trackedFetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(cafe.googlePlaceId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos"
      }
    },
    "place-details"
  );
  if (!response.ok) throw new Error(`${id}: place details HTTP ${response.status}`);
  const { photos = [] } = await response.json();
  if (photos.length < 3) throw new Error(`${id}: only ${photos.length} photos available`);

  for (let index = 0; index < 3; index += 1) {
    const photoUrl = new URL(`https://places.googleapis.com/v1/${photos[index].name}/media`);
    photoUrl.searchParams.set("maxWidthPx", "1400");
    photoUrl.searchParams.set("maxHeightPx", "1050");
    photoUrl.searchParams.set("key", apiKey);
    const photoResponse = await trackedFetch(photoUrl, { redirect: "follow" }, "place-photo");
    if (!photoResponse.ok) throw new Error(`${id} photo ${index + 1}: HTTP ${photoResponse.status}`);
    const bytes = Buffer.from(await photoResponse.arrayBuffer());
    const optimized = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({ width: 1200, height: 900, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true, progressive: true })
      .toBuffer();
    const filename = index === 0 ? `${id}.jpg` : `${id}-${index + 1}.jpg`;
    const target = index === 0 ? path.join(primaryDir, filename) : path.join(galleryDir, filename);
    await fs.writeFile(target, optimized);
    console.log(`${id} photo ${index + 1}: ${optimized.length} bytes`);
  }
}
