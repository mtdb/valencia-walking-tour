const PREFIX = "valencia-tour-shell-";
const CACHE = `${PREFIX}v3`;
const CORE = ["./", "./index.html", "./styles.css", "./src/app.js", "./src/tour-data.js", "./src/utils.js", "./src/navigation.js", "./src/gpx.js", "./src/weather.js", "./src/photos.js", "./manifest.webmanifest", "./icons/compass.svg", "./IMAGE_CREDITS.md", "./route.md"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
const PHOTO_URLS = ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Mercado_Central_Valencia.JPG/1280px-Mercado_Central_Valencia.JPG", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Lonja_de_la_Seda_-_Llotja_de_la_Seda.JPG/1280px-Lonja_de_la_Seda_-_Llotja_de_la_Seda.JPG", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Valencia_-_Plaza_Redonda_07.jpg/1280px-Valencia_-_Plaza_Redonda_07.jpg", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Puerta_barroca_o_%22de_los_hierros%22_de_la_Catedral_de_Santa_Mar%C3%ADa%2C_Valencia.JPG/1280px-Puerta_barroca_o_%22de_los_hierros%22_de_la_Catedral_de_Santa_Mar%C3%ADa%2C_Valencia.JPG", "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Plaza_de_la_Virgen%2C_Valencia.jpg/1280px-Plaza_de_la_Virgen%2C_Valencia.jpg", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Valencia_-_Torres_de_Serranos_01.jpg/1280px-Valencia_-_Torres_de_Serranos_01.jpg", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Fuente_de_los_ni%C3%B1os%2C_obra_de_Mariano_Benlliure_-_Plaza_del_Carmen_de_Valencia.jpg/1280px-Fuente_de_los_ni%C3%B1os%2C_obra_de_Mariano_Benlliure_-_Plaza_del_Carmen_de_Valencia.jpg"];
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && PHOTO_URLS.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request, { mode: "cors", credentials: "omit" });
      if (response.ok && response.headers.get("content-type")?.startsWith("image/")) {
        try { await cache.put(event.request, response.clone()); } catch { /* Storage can be full. */ }
      }
      return response;
    }));
    return;
  }
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (!CORE.some((resource) => new URL(resource, self.registration.scope).pathname === url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch { return event.request.mode === "navigate" ? (await cache.match("./index.html")) ?? Response.error() : Response.error(); }
  }));
});
