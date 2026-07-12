import fs from "node:fs/promises";
import { cafes, regionOptions, routes, tagOptions } from "../src/data.js";

const snapshots = JSON.parse(await fs.readFile(".verification/current-place-snapshots.json", "utf8"));
const byId = new Map(snapshots.map(item => [item.id, item]));
const keepIds = new Set(byId.keys());
const overrides = {
  artis: { address: "1717 Fourth St B, Berkeley, CA 94710" },
  bartavelle: { name: "Bartavelle", address: "1621 San Pablo Ave, Berkeley, CA 94702", coords: [37.874469, -122.2935904] },
  academic: { address: "499 S Second St, San Jose, CA 95113" },
  voyager: { address: "111 W St John St Ste 100, San Jose, CA 95113" },
  "blue-bottle-mint": { address: "66 Mint St, San Francisco, CA 94103", coords: [37.7824703, -122.407756] },
  "mr-espresso": {
    name: "The Caffè by Mr. Espresso",
    address: "1120 Broadway, Oakland, CA 94607",
    coords: [37.8025267, -122.2725026],
    neighborhood: "Downtown Oakland",
    website: "https://www.thecaffeoak.com/",
    note: "Mr. Espresso 在 downtown Oakland 的首家品牌咖啡馆，主打意式咖啡与自家木火烘焙豆。",
    vibe: "明亮的长吧台延续意大利站立饮咖啡文化，空间简洁而温暖；适合在 Broadway 一带短暂停留。"
  },
  "grand-coffee": {
    address: "2663 Mission St, San Francisco, CA 94110",
    coords: [37.7544372, -122.4182629]
  },
  "verve-mission": {
    address: "2101 Market St, San Francisco, CA 94114",
    coords: [37.767477, -122.4291539],
    neighborhood: "Market / Church",
    note: "Verve 在 Market Street 与 Church Street 路口的旧金山门店，交通方便，适合顺接 Castro 行程。",
    vibe: "大窗、浅木和蓝色瓷砖构成明亮空间；Market 与 Church 的转角位置让这里适合快速停留或坐下喝一杯。"
  }
};

const verifiedCafes = cafes.filter(cafe => keepIds.has(cafe.id)).map(cafe => {
  const snapshot = byId.get(cafe.id);
  const current = { ...cafe, ...overrides[cafe.id] };
  const source = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${current.name}, ${current.address}`)}`;
  delete current.ratingCount;
  return {
    ...current,
    image: `/images/cafes/${cafe.id}.jpg`,
    imageCredit: "Google Maps 门店页",
    imageSource: source,
    photoVerifiedAt: "2026-07-10",
    rating: snapshot.rating,
    ratingSource: source,
    ratingVerifiedAt: "2026-07-10"
  };
});

const verifiedRoutes = routes.map(route => ({
  ...route,
  ids: route.id === "all" ? verifiedCafes.map(cafe => cafe.id) : route.ids.filter(id => keepIds.has(id))
}));

const js = `export const dataUpdatedAt = "2026-07-10";\n\n` +
  `export const cafes = ${JSON.stringify(verifiedCafes, null, 2)};\n\n` +
  `export const regionOptions = ${JSON.stringify(regionOptions, null, 2)};\n\n` +
  `export const tagOptions = ${JSON.stringify(tagOptions, null, 2)};\n\n` +
  `export const routes = ${JSON.stringify(verifiedRoutes, null, 2)};\n`;

await fs.writeFile("src/data.js", js);
console.log(JSON.stringify({ cafes: verifiedCafes.length, routes: verifiedRoutes.length }, null, 2));
