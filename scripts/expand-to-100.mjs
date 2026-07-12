import fs from "node:fs/promises";
import { cafes, regionOptions, routes, tagOptions } from "../src/data.js";

const pool = JSON.parse(await fs.readFile(".verification/google-maps-candidate-pool.json", "utf8"));
const current = JSON.parse(await fs.readFile(".verification/current-google-details.json", "utf8"));
const byId = new Map(current.map(item => [item.id, item]));
const byAddress = new Map(pool.map(item => [item.address.toLowerCase(), item]));

const additions = [
  ["sf-delah", "370 4th St, San Francisco, CA 94107", "sf"],
  ["sf-juniper", "1401 Polk St, San Francisco, CA 94109", "sf"],
  ["sf-doppio", "1551 Mission St, San Francisco, CA 94103", "sf"],
  ["sf-hedge", "434 Shotwell St, San Francisco, CA 94110", "sf"],
  ["sf-coffee-berry", "1410 Lombard St, San Francisco, CA 94123", "sf"],
  ["sf-telescope", "345 6th St, San Francisco, CA 94103", "sf"],
  ["sf-golden-goat", "599 3rd St #100, San Francisco, CA 94107", "sf"],
  ["sf-abanico", "2121 Mission St, San Francisco, CA 94110", "sf"],
  ["east-belmo", "1160 University Ave, Berkeley, CA 94702", "east"],
  ["east-delah", "420 W Grand Ave, Oakland, CA 94612", "east"],
  ["east-sanaa-broadway", "801 Broadway, Oakland, CA 94607", "east"],
  ["east-victory-point", "1797 Shattuck Ave. Ste A, Berkeley, CA 94709", "east"],
  ["east-my-coffee", "2080 Martin Luther King Jr Way, Berkeley, CA 94704", "east"],
  ["east-roast-toast", "1746 Shattuck Ave., Berkeley, CA 94709", "east"],
  ["east-jaffa", "1701 University Ave, Berkeley, CA 94703", "east"],
  ["east-mohka", "2139 MacArthur Blvd, Oakland, CA 94602", "east"],
  ["east-heyma", "1122 University Ave, Berkeley, CA 94702", "east"],
  ["east-aint-normal", "5701 College Ave, Oakland, CA 94618", "east"],
  ["peninsula-zombierunner", "344 California Ave, Palo Alto, CA 94306", "peninsula"],
  ["peninsula-one-oz", "650 Castro St #130, Mountain View, CA 94041", "peninsula"],
  ["peninsula-kaizen", "2337 S El Camino Real, San Mateo, CA 94403", "peninsula"],
  ["peninsula-fiero", "106 S El Camino Real, San Mateo, CA 94401", "peninsula"],
  ["peninsula-cloud9", "1901 Embarcadero Rd #103, Palo Alto, CA 94303", "peninsula"],
  ["peninsula-little-late-bird", "777 Mariners Island Blvd Ste 170, San Mateo, CA 94404", "peninsula"],
  ["peninsula-sanaa", "2400 Broadway Ste 120, Redwood City, CA 94063", "peninsula"],
  ["peninsula-cappucho", "1180 Main St, Redwood City, CA 94063", "peninsula"],
  ["peninsula-yard", "1018 Main St, Redwood City, CA 94063", "peninsula"],
  ["peninsula-brew", "3176 Middlefield Rd, Redwood City, CA 94063", "peninsula"],
  ["south-jiaren", "1171 Homestead Rd #140b, Santa Clara, CA 95050", "south"],
  ["south-roys", "197 Jackson St, San Jose, CA 95112", "south"],
  ["south-bavetta", "754 The Alameda #80, San Jose, CA 95126", "south"],
  ["south-chromatic", "460 Lincoln Ave #10, San Jose, CA 95126", "south"],
  ["south-drink", "77 N Almaden Ave #70, San Jose, CA 95110", "south"],
  ["south-nabi", "2255 The Alameda, Santa Clara, CA 95050", "south"],
  ["south-dumont", "28 N Almaden Ave Ste 40, San Jose, CA 95110", "south"],
  ["south-moonbeans", "6219 Santa Teresa Blvd, San Jose, CA 95119", "south"],
  ["south-am-craft", "481 E San Carlos St, San Jose, CA 95112", "south"],
  ["south-qishr", "90 Skyport Dr #140, San Jose, CA 95110", "south"],
  ["marin-firehouse", "317 Johnson St, Sausalito, CA 94965", "marin"],
  ["marin-sanaa", "1146 4th St, San Rafael, CA 94901", "marin"],
  ["marin-franko", "721 Bridgeway, Sausalito, CA 94965", "marin"],
  ["marin-kamson", "819 Francisco Blvd W, San Rafael, CA 94901", "marin"],
  ["marin-coffee-roasters", "466 Ignacio Blvd, Novato, CA 94949", "marin"]
];

const cityFromAddress = address => address.split(",").at(-2).trim();
const sourceFor = place => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`;
const tagsFor = place => {
  const tags = ["community"];
  if (place.categories.some(category => /roast/i.test(category))) tags.unshift("roaster");
  if (place.categories.some(category => /bakery|pastry|dessert/i.test(category))) tags.push("pastry");
  return tags;
};

const refreshed = cafes.filter(cafe => byId.has(cafe.id)).map(cafe => {
  const detail = byId.get(cafe.id);
  if (!detail?.ratingCount) throw new Error(`Missing current Google detail for ${cafe.id}`);
  return { ...cafe, rating: detail.rating, ratingCount: detail.ratingCount, ratingVerifiedAt: "2026-07-11" };
});

const selectedEvidence = [];
const newCafes = additions.map(([id, address, region]) => {
  const place = byAddress.get(address.toLowerCase());
  if (!place) throw new Error(`Candidate not found: ${address}`);
  const city = cityFromAddress(place.address);
  const source = sourceFor(place);
  selectedEvidence.push({ id, selectedAt: "2026-07-11", selectionRule: "Google Maps rating >= 4.5 and rating count >= 100; regional balance and exact-address deduplication applied", ...place });
  return {
    id,
    name: place.name,
    city,
    region,
    neighborhood: place.neighborhood ?? city,
    address: place.address,
    coords: place.coords,
    tags: tagsFor(place),
    signature: "Espresso / filter coffee",
    note: `Google Maps 评分 ${place.rating}（${place.ratingCount.toLocaleString("en-US")} 条评价）；按评分与评价量从 ${city} 候选中入选。`,
    website: place.website ?? source,
    image: `/images/cafes/${id}.jpg`,
    imageCredit: "Google Maps 门店页",
    imageSource: source,
    vibe: `位于 ${place.neighborhood ?? city} 的独立咖啡去处；门店类型为 ${place.categories.slice(0, 3).join("、")}。`,
    rating: place.rating,
    ratingCount: place.ratingCount,
    photoVerifiedAt: "2026-07-11",
    ratingSource: source,
    ratingVerifiedAt: "2026-07-11"
  };
});

const all = [...refreshed, ...newCafes];
if (all.length !== 100 || new Set(all.map(cafe => cafe.id)).size !== 100) throw new Error("Expected 100 unique cafes");
const nextRoutes = routes.map(route => route.id === "all" ? { ...route, ids: all.map(cafe => cafe.id) } : route);
const js = `export const dataUpdatedAt = "2026-07-11";\n\n` +
  `export const cafes = ${JSON.stringify(all, null, 2)};\n\n` +
  `export const regionOptions = ${JSON.stringify(regionOptions, null, 2)};\n\n` +
  `export const tagOptions = ${JSON.stringify(tagOptions, null, 2)};\n\n` +
  `export const routes = ${JSON.stringify(nextRoutes, null, 2)};\n`;
await fs.writeFile("src/data.js", js);
await fs.writeFile(".verification/selected-43-google-maps.json", `${JSON.stringify(selectedEvidence, null, 2)}\n`);
console.log(JSON.stringify({
  total: all.length,
  added: newCafes.length,
  regions: Object.fromEntries(regionOptions.filter(item => item.id !== "all").map(item => [item.id, all.filter(cafe => cafe.region === item.id).length]))
}, null, 2));
