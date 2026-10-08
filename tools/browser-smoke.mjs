import { spawn } from "node:child_process";
import { mkdtemp, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { weatherFixture } from "../tests/weather-fixture.mjs";
import { STOPS } from "../src/tour-data.js";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:4173/valencia-walking-tour/";
await mkdir(new URL("../captures/", import.meta.url), { recursive: true });
const profile = await mkdtemp(join(tmpdir(), "valencia-browser-"));
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-first-run", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
let stderr = "";
browser.stderr.on("data", (data) => { stderr += data; });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(callback, message, timeout = 12_000) {
  const start = Date.now(); let lastError;
  while (Date.now() - start < timeout) {
    try { const result = await callback(); if (result) return result; } catch (error) { lastError = error; }
    await delay(100);
  }
  throw new Error(`${message}${lastError ? `: ${lastError.message}` : ""}`);
}
try {
  const port = await until(async () => (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0], "Chromium did not start");
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const target = await response.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  let nextId = 0;
  const pending = new Map(), errors = [], badResponses = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id); if (!request) return;
      pending.delete(message.id); clearTimeout(request.timeout);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text + " " + (message.params.exceptionDetails.exception?.description || ""));
    else if (message.method === "Network.responseReceived" && message.params.response.status >= 400) badResponses.push(message.params.response.url);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15_000);
      pending.set(id, { resolve, reject, timeout }); ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  const fixture = weatherFixture();
  const injection = `
    window.__weatherMode = "success";
    window.__weatherCalls = [];
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (url, options) => {
      if (String(url).startsWith("https://api.open-meteo.com/")) {
        window.__weatherCalls.push(String(url));
        if (window.__weatherMode === "error" || !navigator.onLine) throw new TypeError("Simulated offline provider");
        return new Response(JSON.stringify(${JSON.stringify(fixture)}), {status:200, headers:{"Content-Type":"application/json"}});
      }
      return nativeFetch(url, options);
    };
    Object.defineProperty(navigator, "clipboard", {configurable:true, value:{writeText:async text => {window.__copiedCoordinates=text;}}});
  `;
  await send("Page.addScriptToEvaluateOnNewDocument", { source: injection });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: base });
  await until(() => evaluate("document.querySelectorAll('.weather-day').length === 7 && document.querySelectorAll('[data-stop-id]').length === 7"), "Page did not render");
  assert.equal(await evaluate("document.querySelectorAll('#historia .history-grid > li').length"), 3);
  assert.equal(await evaluate("document.querySelectorAll('[data-stop-id] .history-tags').length"), 5);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('#historia a[href^=\"#\"]')).every(link => document.querySelector(link.getAttribute('href')) !== null)"), true);
  assert.equal(await evaluate("document.querySelectorAll('.weather-hour').length"), 24);
  assert.equal(await evaluate("document.querySelector('.weather-day').textContent.includes('Hoy')"), true);
  await evaluate("document.querySelectorAll('[data-weather-day]')[1].click()");
  assert.equal(await evaluate("document.querySelector('[data-weather-day][aria-pressed=true]').dataset.weatherDay"), fixture.daily.time[1]);
  assert.equal(await evaluate("document.querySelector('.weather-hour__rain').textContent.includes('75')"), true);
  await evaluate("document.querySelector('[data-weather-day]').click()");

  await evaluate("document.querySelector('[data-visit]').focus(); document.querySelector('[data-visit]').click()");
  assert.equal(await evaluate("document.activeElement === document.querySelector('[data-visit]')"), true);
  assert.equal(await evaluate("document.querySelector('[data-progress]').textContent"), "1 de 7");
  await evaluate("document.querySelector('[data-interior-choice][value=catedral]').click()");
  assert.equal(await evaluate("document.querySelector('[data-budget-total]').textContent.replace(/\\s/g,'')"), "14€");
  await send("Page.reload");
  await until(() => evaluate("document.querySelector('[data-progress]')?.textContent === '1 de 7' && document.querySelectorAll('.weather-day').length === 7"), "Reload persistence");
  assert.equal(await evaluate("document.querySelector('[data-interior-choice][value=catedral]').checked"), true);

  await evaluate("document.querySelector('[data-glossary]').focus(); document.querySelector('[data-glossary]').click()");
  assert.equal(await evaluate("document.querySelector('[data-glossary-dialog]').open"), true);
  await evaluate("document.querySelector('[data-glossary-dialog]').close()");
  await delay(100);
  assert.equal(await evaluate("document.activeElement.hasAttribute('data-glossary')"), true);
  await evaluate("document.querySelector('[data-next=mercado]').click()");
  assert.equal(await evaluate("document.querySelector('[data-map-destination]').textContent.includes('Lonja')"), true);
  await evaluate("document.querySelector('[data-provider=copy]').click()");
  await until(() => evaluate("window.__copiedCoordinates"), "Coordinates not copied");
  assert.equal(await evaluate("window.__copiedCoordinates"), "39.47441, -0.37843");
  await evaluate("document.querySelector('[data-next=carmen]').click()");
  await until(() => evaluate("window.__copiedCoordinates === '39.47394, -0.37858'"), "Final destination did not close the loop");
  assert.equal(await evaluate("(async()=>{const {createGpx}=await import('./src/gpx.js');const xml=new DOMParser().parseFromString(createGpx(),'application/xml'); return xml.querySelectorAll('wpt').length===16&&!xml.querySelector('parsererror');})()"), true);

  await evaluate("window.__weatherMode='error';document.querySelector('[data-weather-refresh]').click()");
  await until(() => evaluate("document.querySelector('[data-weather]').classList.contains('is-stale')"), "Missing stale forecast label");
  assert.equal(await evaluate("document.querySelectorAll('.weather-day').length"), 7);
  await evaluate("window.__weatherMode='success';document.querySelector('[data-weather-refresh]').click()");
  await until(() => evaluate("!document.querySelector('[data-weather]').classList.contains('is-stale')"), "Forecast did not recover");

  async function screenshot(name, width, section = null) {
    await evaluate("document.querySelector('[data-toast]').classList.remove('is-visible')");
    await send("Emulation.setDeviceMetricsOverride", { width, height: width > 680 ? 1000 : 900, deviceScaleFactor: 1, mobile: width <= 680 });
    await evaluate(section ? `document.querySelector('${section}').scrollIntoView({behavior:'instant',block:'start'})` : "window.scrollTo(0,0)");
    await delay(200);
    const overflow = await evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth})");
    assert(overflow.scroll <= overflow.width + 1, `${width}px horizontal overflow: ${overflow.scroll}`);
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(new URL(`../captures/${name}.png`, import.meta.url), Buffer.from(result.data, "base64"));
  }
  await evaluate("document.querySelectorAll('[data-tour-photo]').forEach(img=>img.loading='eager')");
  await until(() => evaluate("Array.from(document.querySelectorAll('[data-tour-photo]')).every(img=>img.complete&&(img.naturalWidth>0||(img.hidden&&img.parentElement.querySelector('.photo-unavailable'))))"), "Photo loading or error state missing");
  assert.equal(await evaluate("document.querySelectorAll('[data-tour-photo]').length"), 8);
  assert.equal(await evaluate("document.querySelectorAll('.stop-art figcaption small a').length"), 14);
  await screenshot("desktop", 1440);
  await screenshot("desktop-weather", 1440, "#tiempo");
  await screenshot("desktop-history", 1440, "#historia");
  await screenshot("mobile", 390);
  await screenshot("mobile-weather", 390, "#tiempo");
  await screenshot("small-mobile-weather", 320, "#tiempo");
  await screenshot("small-mobile-history", 320, "#historia");
  await screenshot("mobile-history-stop", 390, "#parada-almoina");

  await until(() => evaluate("navigator.serviceWorker.controller !== null"), "Service worker did not take control");
  await evaluate("caches.open('madrid-test-sentinel')");
  const offlineScript = await send("Page.addScriptToEvaluateOnNewDocument", { source: "Object.defineProperty(navigator, 'onLine', {configurable:true, get:()=>false});" });
  await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send("Page.reload");
  await until(() => evaluate("document.querySelectorAll('[data-stop-id]').length === 7 && document.querySelectorAll('.weather-day').length === 7"), "Offline guide failed");
  assert.equal(await evaluate("document.querySelector('[data-weather]').classList.contains('is-stale')"), true);
  assert.equal(await evaluate("(async()=> (await caches.keys()).includes('madrid-test-sentinel'))()"), true);
  assert.equal(await evaluate("document.querySelectorAll('#historia .history-grid > li').length"), 3);
  assert.equal(await evaluate("document.querySelectorAll('[data-stop-id] .history-tags').length"), 5);
  await evaluate("document.querySelectorAll('img').forEach(img=>img.loading='eager')");
  await until(() => evaluate("Array.from(document.images).every(img=>img.complete&&(img.naturalWidth>0||(img.hidden&&img.parentElement.querySelector('.photo-unavailable'))))"), "Offline photos or unavailable state did not render");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: offlineScript.identifier });
  await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await evaluate("localStorage.removeItem('valencia-tour:weather-v1'); window.__weatherMode='error';");
  // New document with no cache and a failing provider: no invented weather.
  const failScript = await send("Page.addScriptToEvaluateOnNewDocument", { source: "localStorage.removeItem('valencia-tour:weather-v1'); window.__weatherMode='error';" });
  await send("Page.reload");
  await until(() => evaluate("document.querySelector('.weather-empty') !== null"), "Empty provider error state missing");
  assert.equal(await evaluate("document.querySelectorAll('.weather-hour').length"), 0);
  assert.equal(await evaluate("document.querySelectorAll('[data-stop-id]').length"), STOPS.length);
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: failScript.identifier });
  await evaluate("window.__weatherMode='success'; document.querySelector('[data-weather-refresh]').click()");
  await until(() => evaluate("document.querySelectorAll('.weather-day').length === 7"), "Retry from empty state failed");
  assert.deepEqual(errors, [], "Browser exceptions");
  assert.deepEqual(badResponses, [], "HTTP errors");
  ws.close();
  await writeFile(new URL("../captures/browser-report.json", import.meta.url), JSON.stringify({ passed: true, source: "Synthetic weather fixtures; real photo loading or error states depending on network availability", checks: ["1440/390/320 responsive widths", "historical overview, stop labels and links, including offline", "7 forecast days and hourly changes", "visited focus and persistence", "budget persistence", "glossary focus", "copy next/return destination", "GPX XML", "stale/error/retry weather", "offline subpath shell and photo fallback", "unrelated cache retained"], errors, badResponses }, null, 2));
  console.log("Browser smoke passed: responsive layout, weather days/cache/error/retry, route persistence/navigation, GPX and offline subpath guide. Screenshots in captures/.");
} catch (error) {
  console.error(error); if (stderr && !stderr.includes("DevTools listening")) console.error(stderr.slice(-2000)); process.exitCode = 1;
} finally {
  browser.kill("SIGTERM"); await delay(400); await rm(profile, { recursive: true, force: true }).catch(() => {});
}
