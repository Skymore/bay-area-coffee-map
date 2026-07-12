import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const selected = JSON.parse(await fs.readFile(".verification/selected-43-google-maps.json", "utf8"));
const imageDir = path.resolve("public/images/cafes");
await fs.mkdir(imageDir, { recursive: true });
await fs.rm(path.join(imageDir, "peninsula-oklava.jpg"), { force: true });
const manifest = [];

for (const [index, place] of selected.entries()) {
  const response = await fetch(place.imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`${place.id}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/") || bytes.length < 10_000) {
    throw new Error(`${place.id}: invalid image (${contentType}, ${bytes.length} bytes)`);
  }
  const target = path.join(imageDir, `${place.id}.jpg`);
  await fs.writeFile(target, bytes);
  manifest.push({
    id: place.id,
    file: `/images/cafes/${place.id}.jpg`,
    source: place.googleMapsUrl,
    imageUrl: place.imageUrl,
    bytes: bytes.length,
    contentType,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  });
  console.log(`${index + 1}/${selected.length} ${place.id}: ${bytes.length} bytes`);
}

await fs.writeFile(".verification/selected-43-image-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ total: manifest.length, uniqueHashes: new Set(manifest.map(item => item.sha256)).size }, null, 2));
