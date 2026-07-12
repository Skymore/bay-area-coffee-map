import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { photoData } from "../src/photoData.js";

const additions = {
  states: [{
    image: "https://assets.simpleviewinc.com/simpleview/image/upload/c_limit,h_1200,q_75,w_1200/v1/crm/oakland/States-Coffee-720x540_D845FA08-5056-A36F-23FA9BABE779DC4C-d845f9135056a36_d845fa5e-5056-a36f-2327a2f18f708c8e.jpg",
    source: "https://www.visitoakland.com/listing/states-coffee/5569/",
    credit: "Visit Oakland"
  }],
  "big-mug": [
    {
      image: "http://www.simarchitectsinc.com/main/wp-content/uploads/2015/06/Big-Mug-03.jpg",
      source: "https://www.simarchitectsinc.com/main/portfolio/big-mug-coffee-roaster/",
      credit: "SIM Architects"
    },
    {
      image: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/10/a0/ac/67/photo1jpg.jpg?w=1200&h=1200&s=1",
      source: "https://www.tripadvisor.com/Restaurant_Review-g33046-d10458725-Reviews-Big_Mug_Coffee_Roaster-Santa_Clara_California.html",
      credit: "Tripadvisor 门店页"
    }
  ],
  "south-moonbeans": [{
    image: "https://pub-ba1a74be17d7442a9f2541946eb9510e.r2.dev/shops/f951cc04-dad5-4f15-a31f-b49b22e37a6d/0.jpg",
    source: "https://joe.coffee/locations/ca/san-jose/moonbean-s-coffee-san-jose/",
    credit: "Joe Coffee 门店页"
  }]
};

for (const [id, candidates] of Object.entries(additions)) {
  const photos = photoData[id] || [];
  for (const candidate of candidates) {
    if (photos.length >= 3) break;
    const response = await fetch(candidate.image, {
      headers: { "user-agent": "Mozilla/5.0", referer: candidate.source },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) continue;
    const input = Buffer.from(await response.arrayBuffer());
    const filename = `${id}-curated-${photos.length + 1}.jpg`;
    await sharp(input, { failOn: "none" })
      .rotate()
      .resize(960, 600, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.resolve("public/images/gallery", filename));
    photos.push({ file: `images/gallery/${filename}`, credit: candidate.credit, source: candidate.source });
  }
  photoData[id] = photos;
}

await fs.writeFile("src/photoData.js", `export const photoData = ${JSON.stringify(photoData, null, 2)};\n`);
console.log(JSON.stringify(Object.fromEntries(Object.keys(additions).map(id => [id, photoData[id].length])), null, 2));
