import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { cafes } from "../src/data.js";

const imageDir = path.resolve("public/images/cafes");
const originalManifestPath = ".verification/image-manifest.json";
const selectedManifestPath = ".verification/selected-43-image-manifest.json";
const originalManifest = JSON.parse(await fs.readFile(originalManifestPath, "utf8"));
const selectedManifest = JSON.parse(await fs.readFile(selectedManifestPath, "utf8"));
const metadataById = new Map(
  [...originalManifest, ...selectedManifest].map((item) => [item.id, item])
);
const originalIds = new Set(originalManifest.map((item) => item.id));
const selectedIds = new Set(selectedManifest.map((item) => item.id));

async function fileRecord(cafe) {
  const source = metadataById.get(cafe.id);
  const file = `/images/cafes/${cafe.id}.jpg`;
  const buffer = await fs.readFile(path.join(imageDir, `${cafe.id}.jpg`));

  return {
    id: cafe.id,
    file,
    source: source?.source ?? cafe.imageSource ?? cafe.ratingSource,
    ...(source?.imageUrl ? { imageUrl: source.imageUrl } : {}),
    bytes: buffer.length,
    contentType: "image/jpeg",
    sha256: crypto.createHash("sha256").update(buffer).digest("hex")
  };
}

async function optimizeImage(cafe) {
  const target = path.join(imageDir, `${cafe.id}.jpg`);
  const original = await fs.readFile(target);
  const image = sharp(original, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const shouldResize = (metadata.width ?? 0) > 620 || (metadata.height ?? 0) > 480;
  const shouldCompress = original.length > 30_000 || shouldResize;

  if (!shouldCompress) {
    return { id: cafe.id, before: original.length, after: original.length, changed: false };
  }

  const optimized = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({
      width: 620,
      height: 480,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({
      quality: 58,
      mozjpeg: true,
      progressive: true
    })
    .toBuffer();

  if (optimized.length < 10_000 || optimized.length >= original.length) {
    return { id: cafe.id, before: original.length, after: original.length, changed: false };
  }

  await fs.writeFile(target, optimized);
  return { id: cafe.id, before: original.length, after: optimized.length, changed: true };
}

const results = [];
for (const cafe of cafes) {
  results.push(await optimizeImage(cafe));
}

const records = [];
for (const cafe of cafes) {
  records.push(await fileRecord(cafe));
}

const missing = cafes.filter((cafe) => !metadataById.has(cafe.id));
if (missing.length > 0) {
  throw new Error(`missing manifest metadata: ${missing.map((cafe) => cafe.id).join(", ")}`);
}

await fs.writeFile(
  originalManifestPath,
  `${JSON.stringify(records.filter((item) => originalIds.has(item.id)), null, 2)}\n`
);
await fs.writeFile(
  selectedManifestPath,
  `${JSON.stringify(records.filter((item) => selectedIds.has(item.id)), null, 2)}\n`
);

const before = results.reduce((sum, item) => sum + item.before, 0);
const after = results.reduce((sum, item) => sum + item.after, 0);
const changed = results.filter((item) => item.changed).length;
const tooSmall = records.filter((item) => item.bytes < 10_000);
const uniqueHashes = new Set(records.map((item) => item.sha256)).size;

if (tooSmall.length > 0) {
  throw new Error(`images under 10 KB: ${tooSmall.map((item) => item.id).join(", ")}`);
}

if (uniqueHashes !== cafes.length) {
  throw new Error(`duplicate image hashes: ${uniqueHashes}/${cafes.length}`);
}

console.log(
  JSON.stringify(
    {
      images: cafes.length,
      changed,
      before,
      after,
      saved: before - after,
      uniqueHashes
    },
    null,
    2
  )
);
