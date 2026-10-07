import test from "node:test";
import assert from "node:assert/strict";
import { destinationFor, mapUrl } from "../src/navigation.js";
import { createGpx } from "../src/gpx.js";
import { ROUTE, WAYPOINTS } from "../src/tour-data.js";

test("next/place/completion resolve different destinations with a uniform coordinate shape", () => {
  assert.equal(destinationFor("place", "mercado").id, "mercado");
  assert.equal(destinationFor("next", "mercado").id, "comercio");
  assert.deepEqual(destinationFor("next", "carmen").coordinates, ROUTE.start.coordinates);
  assert.equal(destinationFor("next", "unknown"), null);
});
test("Google navigation uses the entrance address when present and omits a fixed origin", () => {
  const target = destinationFor("next", "mercado");
  const url = new URL(mapUrl("google", "next", target));
  assert.equal(url.searchParams.get("destination"), "Carrer de la Llotja 2, Valencia, España");
  assert.equal(url.searchParams.get("travelmode"), "walking");
  assert.equal(url.searchParams.has("origin"), false);
  assert(mapUrl("osmand", "next", ROUTE.end).includes("profile=pedestrian"));
});
test("GPX escapes editorial text and exports circular references, not an invented track", () => {
  const gpx = createGpx();
  assert.equal([...gpx.matchAll(/<wpt /g)].length, WAYPOINTS.length);
  assert(!gpx.includes("<trk>"));
  assert(createGpx([{ name: "Agua & plaza <exterior>", coordinates: ROUTE.start.coordinates }]).includes("Agua &amp; plaza &lt;exterior&gt;"));
});
