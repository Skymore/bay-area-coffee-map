import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { cafes } from "../src/data.js";
import { photoData } from "../src/photoData.js";

const sourceDir = path.resolve("public/images/cafes");
const atlasFiles = [
  ["images/cafe-atlas.jpg", "images/cafe-atlas-1b.jpg"],
  ["images/cafe-atlas-2.jpg", "images/cafe-atlas-2b.jpg"],
  ["images/cafe-atlas-3.jpg", "images/cafe-atlas-3b.jpg"]
];
const modulePath = path.resolve("src/imageAtlas.js");
// The publisher now accepts up to 100 MB / 100 files. Keep the three-file
// atlas approach for fast loading, but preserve enough detail for the lightbox.
const cellWidth = 720;
const cellHeight = 405;
const columns = 10;
const cafesPerAtlas = 60;
const rows = Math.ceil(cafesPerAtlas / columns);
const width = cellWidth * columns;
const height = cellHeight * rows;

await fs.mkdir(path.resolve("public/images"), { recursive: true });

const items = {};
for (const [index, cafe] of cafes.entries()) {
  const pageIndex = Math.floor(index / cafesPerAtlas);
  const pageOffset = index % cafesPerAtlas;
  const left = (pageOffset % columns) * cellWidth;
  const top = Math.floor(pageOffset / columns) * cellHeight;
  items[cafe.id] = { page: pageIndex, x: left, y: top };
}

const atlasResults = [];
for (const [photoIndex, photoAtlasFiles] of atlasFiles.entries()) {
  for (const [pageIndex, atlasFile] of photoAtlasFiles.entries()) {
    const composites = [];
    const pageCafes = cafes.slice(pageIndex * cafesPerAtlas, (pageIndex + 1) * cafesPerAtlas);
    for (const cafe of pageCafes) {
      const photo = photoData[cafe.id]?.[photoIndex];
      if (!photo) continue;
      const source = photoIndex === 0
        ? path.join(sourceDir, `${cafe.id}.jpg`)
        : path.resolve("public", photo.file);
      try {
        const input = await sharp(source, { failOn: "none" })
          .rotate()
          .resize(cellWidth, cellHeight, { fit: "cover", position: "attention" })
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer();
        const item = items[cafe.id];
        composites.push({ input, left: item.x, top: item.y });
      } catch {
        // A missing optional gallery image leaves its atlas cell blank.
      }
    }

    const atlasPath = path.resolve("public", atlasFile);
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: "#efe5d4"
      }
    })
      .composite(composites)
      .jpeg({ quality: 84, mozjpeg: true, progressive: true })
      .toFile(atlasPath);
    const stat = await fs.stat(atlasPath);
    atlasResults.push({ file: atlasFile, images: composites.length, bytes: stat.size });
  }
}

const moduleSource = `export const imageAtlas = ${JSON.stringify(
  {
    files: atlasFiles,
    width,
    height,
    cellWidth,
    cellHeight,
    items
  },
  null,
  2
)};
`;

await fs.writeFile(modulePath, moduleSource);
console.log(
  JSON.stringify(
    {
      atlases: atlasResults,
      images: atlasResults.reduce((sum, atlas) => sum + atlas.images, 0),
      bytes: atlasResults.reduce((sum, atlas) => sum + atlas.bytes, 0),
      width,
      height
    },
    null,
    2
  )
);
