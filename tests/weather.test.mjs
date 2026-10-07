import test from "node:test";
import assert from "node:assert/strict";
import { valenciaNow, parseForecast, validCache, fetchForecast, WEATHER_URL, FRESH_MS, MAX_CACHE_MS, weatherCondition, calendarLabel } from "../src/weather.js";
import { weatherFixture } from "./weather-fixture.mjs";

test("today follows Valencia across midnight, regardless of machine timezone", () => {
  assert.deepEqual(valenciaNow(new Date("2026-10-09T22:30:00Z")), { date: "2026-10-10", hour: 0, time: "00:30" });
  assert.equal(valenciaNow(new Date("2026-01-10T23:15:00Z")).date, "2026-01-11");
});
test("the DST change keeps the repeated local hour on the correct day", () => {
  assert.equal(valenciaNow(new Date("2026-10-25T00:30:00Z")).hour, 2);
  assert.equal(valenciaNow(new Date("2026-10-25T01:30:00Z")).hour, 2);
  assert.equal(valenciaNow(new Date("2026-03-29T01:30:00Z")).hour, 3);
});
test("parses seven days and preserves null values instead of inventing zero", () => {
  const fixture = weatherFixture(); fixture.hourly.precipitation_probability[0] = null;
  const days = parseForecast(fixture);
  assert.equal(days.length, 7); assert.equal(days[0].hours.length, 24);
  assert.equal(days[0].hours[0].rain, null);
  assert.equal(days[1].hours[0].rain, 75);
});
test("rejects malformed, mismatched and differently zoned forecasts", () => {
  const fixture = weatherFixture();
  assert.throws(() => parseForecast({}));
  assert.throws(() => parseForecast({ ...fixture, timezone: "UTC" }));
  assert.throws(() => parseForecast({ ...fixture, hourly: { ...fixture.hourly, wind_speed_10m: [] } }));
  assert.throws(() => parseForecast({ ...fixture, hourly_units: { ...fixture.hourly_units, temperature_2m: "°F" } }));
});
test("a repeated hour remains visible when present in a DST payload", () => {
  const fixture = weatherFixture(new Date("2026-10-25T00:00:00Z"));
  for (const values of Object.values(fixture.hourly)) values.splice(3, 0, values[2]);
  assert.equal(parseForecast(fixture)[0].hours.length, 25);
});
test("cache freshness, expiry and coverage prevent yesterday posing as today", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const record = { version: 1, savedAt: now.getTime() - 1000, payload: weatherFixture(now) };
  assert.equal(validCache(record, now).fresh, true);
  assert.equal(validCache({ ...record, savedAt: now.getTime() - FRESH_MS - 1 }, now).fresh, false);
  assert.equal(validCache({ ...record, savedAt: now.getTime() - MAX_CACHE_MS - 1 }, now), null);
  assert.equal(validCache({ ...record, payload: weatherFixture(new Date("2026-10-01T08:00:00Z")) }, now), null);
  assert.equal(validCache({ ...record, savedAt: now.getTime() + 120_000 }, now), null);
  assert.equal(validCache({ ...record, payload: "corrupted" }, now), null);
});
test("request fixes Valencia, Celsius, local time and seven forecast days", async () => {
  const params = new URL(WEATHER_URL).searchParams;
  assert.equal(params.get("timezone"), "Europe/Madrid"); assert.equal(params.get("forecast_days"), "7");
  assert.equal(params.get("temperature_unit"), "celsius");
  const result = await fetchForecast({ fetcher: async () => ({ ok: true, json: async () => weatherFixture() }) });
  assert.equal(result.days.length, 7);
  await assert.rejects(fetchForecast({ fetcher: async () => ({ ok: false }) }));
});
test("timeout aborts a slow provider rather than indefinitely blocking the widget", async () => {
  await assert.rejects(fetchForecast({ timeoutMs: 10, fetcher: (_, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true })) }), /Aborted/);
});
test("unknown weather stays unknown and dates format without UTC day drift", () => {
  assert.equal(weatherCondition(null).label, "Previsión no disponible");
  assert.equal(weatherCondition(0, false).icon, "moon");
  assert.equal(weatherCondition(95).label, "Tormenta");
  assert.equal(calendarLabel("2026-10-10", { weekday: "long" }), "sábado");
});
