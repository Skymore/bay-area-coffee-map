import fs from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const cafeImageDir = path.join(distDir, "images/cafes");
const galleryImageDir = path.join(distDir, "images/gallery");
const atlasPaths = [
  path.join(distDir, "images/cafe-atlas.jpg"),
  path.join(distDir, "images/cafe-atlas-1b.jpg"),
  path.join(distDir, "images/cafe-atlas-2.jpg"),
  path.join(distDir, "images/cafe-atlas-2b.jpg"),
  path.join(distDir, "images/cafe-atlas-3.jpg"),
  path.join(distDir, "images/cafe-atlas-3b.jpg")
];

await fs.rm(cafeImageDir, { recursive: true, force: true });
await fs.rm(galleryImageDir, { recursive: true, force: true });

const atlases = await Promise.all(atlasPaths.map(atlasPath => fs.stat(atlasPath)));
const files = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
}

await walk(distDir);
console.log(
  JSON.stringify(
    {
      files: files.length,
      atlasBytes: atlases.reduce((sum, atlas) => sum + atlas.size, 0),
      removed: ["dist/images/cafes", "dist/images/gallery"]
    },
    null,
    2
  )
);
