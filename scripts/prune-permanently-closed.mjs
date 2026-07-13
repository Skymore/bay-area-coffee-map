import fs from "node:fs/promises";
import path from "node:path";
import { cafes, dataUpdatedAt, regionOptions, routes, tagOptions } from "../src/data.js";
import { photoData } from "../src/photoData.js";

const removed = cafes.filter(cafe => cafe.placeBusinessStatus === "CLOSED_PERMANENTLY");
const removedIds = new Set(removed.map(cafe => cafe.id));

function compactNearby(place) {
  const { types: _types, ...compact } = place;
  return compact;
}

const nearbyKeys = ["groceries", "transit", "gasStations", "schools", "attractions"];

const remainingCafes = cafes
  .filter(cafe => !removedIds.has(cafe.id))
  .map(cafe => ({
    ...cafe,
    nearbyPlaces: cafe.nearbyPlaces ? {
      ...cafe.nearbyPlaces,
      ...Object.fromEntries(nearbyKeys.map(key => [key, (cafe.nearbyPlaces[key] ?? []).map(compactNearby)]))
    } : cafe.nearbyPlaces
  }));
const remainingRoutes = routes.map(route => ({
  ...route,
  ids: route.ids.filter(id => !removedIds.has(id))
}));
const remainingPhotoData = Object.fromEntries(
  Object.entries(photoData).filter(([id]) => !removedIds.has(id))
);

const dataSource = `export const dataUpdatedAt = ${JSON.stringify(dataUpdatedAt)};\n\n` +
  `export const cafes = ${JSON.stringify(remainingCafes, null, 2)};\n\n` +
  `export const regionOptions = ${JSON.stringify(regionOptions, null, 2)};\n\n` +
  `export const tagOptions = ${JSON.stringify(tagOptions, null, 2)};\n\n` +
  `export const routes = ${JSON.stringify(remainingRoutes, null, 2)};\n`;
const photoSource = `export const photoData = ${JSON.stringify(remainingPhotoData, null, 2)};\n`;
await fs.writeFile("src/data.js", dataSource);
await fs.writeFile("src/photoData.js", photoSource);

for (const cafe of removed) {
  const photos = photoData[cafe.id] ?? [];
  for (const photo of photos) {
    await fs.unlink(path.resolve("public", photo.file)).catch(error => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

if (removed.length) {
  await fs.mkdir(".verification", { recursive: true });
  await fs.writeFile(".verification/removed-permanently-closed.json", `${JSON.stringify({
    removedAt: new Date().toISOString(),
    removed: removed.map(cafe => ({ id: cafe.id, name: cafe.name, status: cafe.placeBusinessStatus })),
    remaining: remainingCafes.length
  }, null, 2)}\n`);
}

console.log(JSON.stringify({
  removed: removed.map(cafe => `${cafe.id} (${cafe.name})`),
  remaining: remainingCafes.length
}, null, 2));
