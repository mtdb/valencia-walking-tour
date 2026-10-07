import { readFile, stat, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { STOPS, ROUTE_ORDER, INTERIORS, GLOSSARY, WAYPOINTS, ROUTE } from "../src/tour-data.js";

import { PHOTOS } from "../src/photos.js";

const root = new URL("../", import.meta.url);
const modules = ["sw.js", ...((await readdir(new URL("src/", root))).filter((file) => file.endsWith(".js")).map((file) => `src/${file}`))];
for (const file of modules) {
  const result = spawnSync(process.execPath, ["--check", new URL(file, root).pathname], { encoding: "utf8" });
  assert.equal(result.status, 0, `${file}: ${result.stderr}`);
}
assert.equal(new Set(STOPS.map((stop) => stop.id)).size, STOPS.length, "Duplicate stop IDs");
assert.deepEqual(ROUTE_ORDER, STOPS.map((stop) => stop.id));
assert.equal(new Set(INTERIORS.map((item) => item.id)).size, INTERIORS.length);
for (const stop of STOPS) {
  for (const key of ["name", "shortName", "description", "look", "curiosity", "practical", "transition", "duration", "cost"]) assert.equal(typeof stop[key], "string", `${stop.id}: ${key}`);
  assert(stop.sources.length, `${stop.id}: sources`);
  for (const source of stop.sources) assert.equal(new URL(source.url).protocol, "https:");
  for (const id of stop.interiors) assert(INTERIORS.some((item) => item.id === id), `${stop.id}: ${id}`);
  for (const key of stop.glossary) assert(GLOSSARY.some((item) => item.key === key), `${stop.id}: ${key}`);
  const photo = PHOTOS[stop.id];
  assert(photo?.alt && photo?.author && photo?.license);
  assert.equal(new URL(photo.src).hostname, "upload.wikimedia.org");
  assert.equal(new URL(photo.source).hostname, "commons.wikimedia.org");
  assert(photo.width > 0 && photo.height > 0);
}
for (const point of [...STOPS, ...WAYPOINTS]) {
  assert(point.coordinates.lat > 39.47 && point.coordinates.lat < 39.49, point.name);
  assert(point.coordinates.lng > -0.39 && point.coordinates.lng < -0.37, point.name);
}
assert.deepEqual(ROUTE.start.coordinates, ROUTE.end.coordinates);
assert.deepEqual(WAYPOINTS[0].coordinates, WAYPOINTS.at(-1).coordinates);
for (const item of INTERIORS) { assert(Number.isFinite(item.price) && item.price >= 0); assert.equal(new URL(item.source).protocol, "https:"); }
assert.equal(INTERIORS.filter((item) => item.base).reduce((sum, item) => sum + item.price, 0), 2);
assert.equal(INTERIORS.reduce((sum, item) => sum + item.price, 0), 36);
const html = await readFile(new URL("index.html", root), "utf8");
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^https?:/.test(match[1])) continue;
  assert((await stat(new URL(match[1], root))).isFile(), match[1]);
}
const worker = await readFile(new URL("sw.js", root), "utf8");
for (const photo of Object.values(PHOTOS)) assert(worker.includes(photo.src), `Photo missing from offline allowlist: ${photo.caption}`);
const assets = [...worker.matchAll(/"\.\/([^"\s]+)"/g)].map((match) => match[1]);
for (const asset of assets) assert((await stat(new URL(asset, root))).isFile(), asset);
for (const file of ["manifest.webmanifest", "package.json"]) JSON.parse(await readFile(new URL(file, root), "utf8"));
console.log(`Checked ${modules.length} scripts, ${STOPS.length} stops, ${WAYPOINTS.length} circular waypoints, budget and local shell assets.`);
