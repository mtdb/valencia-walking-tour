import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("activation deletes old Valencia shells while retaining another guide's cache", async () => {
  const handlers = {};
  const deleted = [];
  let activation;
  runInNewContext(await readFile(new URL("../sw.js", import.meta.url), "utf8"), {
    self: { addEventListener: (event, callback) => { handlers[event] = callback; }, clients: { claim: async () => {} } },
    caches: { keys: async () => ["valencia-tour-shell-v3", "valencia-tour-shell-v2", "valencia-tour-shell-v1", "valencia-tour-shell-v0", "avignon-tour-v2", "other-app-cache"], delete: async (key) => { deleted.push(key); return true; } },
  });
  handlers.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ["valencia-tour-shell-v2", "valencia-tour-shell-v1", "valencia-tour-shell-v0"]);
});

test("only successful selected photos are cached and remain readable offline", async () => {
  const { PHOTOS } = await import("../src/photos.js");
  const url = PHOTOS.mercado.src;
  const stored = new Map(), handlers = {};
  let networkCalls = 0, fail = false;
  const cache = {
    match: async request => stored.get(request.url),
    put: async (request, response) => { stored.set(request.url, response); },
  };
  runInNewContext(await readFile(new URL("../sw.js", import.meta.url), "utf8"), {
    URL, Response,
    self: { addEventListener: (event, callback) => { handlers[event] = callback; }, location: { origin: "https://example.org" }, registration: { scope: "https://example.org/valencia-walking-tour/" } },
    caches: { open: async () => cache },
    fetch: async () => { networkCalls++; return new Response(fail ? "Unavailable" : "photo bytes", { status: fail ? 503 : 200, headers: { "content-type": fail ? "text/plain" : "image/jpeg" } }); },
  });
  async function requestPhoto(photoUrl) {
    let result;
    handlers.fetch({ request: { url: photoUrl, method: "GET" }, respondWith: promise => { result = promise; } });
    return result;
  }
  fail = true;
  assert.equal((await requestPhoto(url)).status, 503);
  assert.equal(stored.size, 0, "Failed responses must not poison offline photos");
  fail = false;
  assert.equal(await (await requestPhoto(url)).text(), "photo bytes");
  assert.equal(stored.size, 1);
  fail = true;
  assert.equal(await (await requestPhoto(url)).text(), "photo bytes");
  assert.equal(networkCalls, 2, "Cached photo must be used without another network call");
  assert.equal(await requestPhoto("https://upload.wikimedia.org/unrelated.jpg"), undefined);
});
