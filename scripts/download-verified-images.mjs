import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const snapshots = JSON.parse(await fs.readFile(".verification/current-place-snapshots.json", "utf8"));
const imageDir = path.resolve("public/images/cafes");
const manifestPath = path.resolve(".verification/image-manifest.json");
await fs.mkdir(imageDir, { recursive: true });
const manifest = [];

for (const [index, place] of snapshots.entries()) {
  const target = path.join(imageDir, `${place.id}.jpg`);
  const largeUrl = place.photoUrl.replace(/=w\d+-h\d+(-k-no)?$/, "=w1200-h800-k-no");
  let response = await fetch(largeUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) response = await fetch(place.photoUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`${place.id}: image HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/") || bytes.length < 10_000) {
    throw new Error(`${place.id}: invalid image (${contentType}, ${bytes.length} bytes)`);
  }
  await fs.writeFile(target, bytes);
  manifest.push({
    id: place.id,
    file: `/images/cafes/${place.id}.jpg`,
    source: place.googleMapsUrl,
    bytes: bytes.length,
    contentType,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  });
  console.log(`${index + 1}/${snapshots.length} ${place.id}: ${bytes.length} bytes`);
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ total: manifest.length, uniqueHashes: new Set(manifest.map(item => item.sha256)).size }, null, 2));
