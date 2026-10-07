import { STOPS, INTERIORS, GLOSSARY, ROUTE, VERIFIED } from "./tour-data.js";
import { escapeHtml as e, readStorage, writeStorage, euro } from "./utils.js";
import { PROVIDERS, destinationFor, mapUrl } from "./navigation.js";
import { downloadGpx } from "./gpx.js";
import { mountWeather } from "./weather.js";
import { PHOTOS } from "./photos.js";

const KEYS = { visited: "valencia-tour:visited-v1", interiors: "valencia-tour:interiors-v1", provider: "valencia-tour:provider-v1" };
const validIds = (value, items) => Array.isArray(value) ? [...new Set(value.filter((id) => items.some((item) => item.id === id)))] : [];
const savedInteriors = readStorage(KEYS.interiors, null);
const state = {
  visited: validIds(readStorage(KEYS.visited, []), STOPS),
  interiors: savedInteriors === null ? INTERIORS.filter((item) => item.base).map((item) => item.id) : validIds(savedInteriors, INTERIORS),
  provider: readStorage(KEYS.provider, "ask"),
};
if (!PROVIDERS.includes(state.provider)) state.provider = "ask";
const $ = (selector, root = document) => root.querySelector(selector);
let toastTimer;
function announce(message) {
  const toast = $("[data-toast]"); toast.textContent = message; toast.classList.add("is-visible");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3600);
}
function interiorMarkup(id) {
  const item = INTERIORS.find((entry) => entry.id === id);
  return `<div class="interior-detail" data-interior-ref="${item.id}"><div class="interior-detail__heading"><strong>${e(item.name)}</strong><span class="price-tag">${euro(item.price)}</span></div><p>${e(item.note)}</p><p><strong>Horario habitual.</strong> ${e(item.hours)}</p><p><strong>Acceso.</strong> ${e(item.access)}</p><a href="${e(item.source)}" target="_blank" rel="noreferrer">Tarifas y condiciones ↗</a>${item.hoursSource ? ` · <a href="${e(item.hoursSource)}" target="_blank" rel="noreferrer">Horarios ↗</a>` : ""}<span class="interior-selected" data-selected-label hidden>Incluido en tu presupuesto</span></div>`;
}
function stopMarkup(stop, index) {
  const number = String(index + 1).padStart(2, "0");
  const next = STOPS[index + 1];
  const photo = PHOTOS[stop.id];
  return `<article class="stop stop-${stop.tone}" id="parada-${stop.id}" data-stop-id="${stop.id}" aria-labelledby="title-${stop.id}"><div class="stop-heading"><span class="stop-number" aria-hidden="true">${number}</span><div><p class="eyebrow">${e(stop.eyebrow)}</p><h3 id="title-${stop.id}">${e(stop.name)}</h3><p class="stop-subtitle">${e(stop.subtitle)}</p></div></div><div class="stop-layout"><div class="stop-content"><div class="stop-meta"><span>${e(stop.duration)}</span><span>${e(stop.cost)}</span></div><p class="stop-description">${e(stop.description)}</p><div class="look-box"><span class="small-label">Fíjate en esto</span><p>${e(stop.look)}</p></div><p class="curiosity"><strong>Un detalle más.</strong> ${e(stop.curiosity)}</p>${stop.glossary.length ? `<div class="glossary-links">${stop.glossary.map((key) => `<button class="glossary-term" type="button" data-glossary="${key}" aria-haspopup="dialog">${e(GLOSSARY.find((item) => item.key === key).title)} <span aria-hidden="true">?</span></button>`).join("")}</div>` : ""}<details class="stop-practical"><summary>Horarios, entradas y accesos <span aria-hidden="true">+</span></summary><div><p>${e(stop.practical)}</p>${stop.interiors.map(interiorMarkup).join("")}<small>Información revisada: ${VERIFIED.split("-").reverse().join("/")}. Consulta la web oficial antes de la visita.</small></div></details><div class="stop-actions"><button class="button button-dark" type="button" data-next="${stop.id}">${next ? "Ir a la siguiente parada" : "Volver al punto de inicio"}<span aria-hidden="true">↗</span></button><button class="button button-outline" type="button" data-place="${stop.id}">Ver en el mapa</button><button class="visit-toggle" type="button" data-visit="${stop.id}" aria-pressed="false"><span class="visit-box" aria-hidden="true"></span><span data-visit-label>Marcar como visitada</span></button></div><div class="stop-sources">${stop.sources.map((source) => `<a href="${e(source.url)}" target="_blank" rel="noreferrer">${e(source.label)} ↗</a>`).join("")}</div></div><div class="stop-aside"><figure class="stop-art"><img src="${e(photo.src)}" alt="${e(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async" data-tour-photo referrerpolicy="no-referrer"/><figcaption><div><span>${e(photo.caption)}</span><small><a href="${e(photo.source)}" target="_blank" rel="noreferrer">${e(photo.author)}</a> · <a href="${e(photo.licenseUrl)}" target="_blank" rel="noreferrer">${e(photo.license)}</a></small></div><strong>${number}</strong></figcaption></figure><div class="next-note"><span class="small-label">${next ? "Siguiente parada" : "De vuelta al Mercado"}</span><p>${e(stop.transition)}</p><a href="${next ? `#parada-${next.id}` : "#inicio"}">${e(next ? next.name : "Plaza del Mercado")} <span aria-hidden="true">→</span></a></div></div></div></article>`;
}
$("[data-stops]").innerHTML = STOPS.map(stopMarkup).join("");
// Keep useful captions and layout if the external photo is unavailable.
for (const img of document.querySelectorAll("[data-tour-photo]")) {
  const showFailure = () => {
    if (img.parentElement.querySelector(".photo-unavailable")) return;
    img.hidden = true;
    const message = document.createElement("p");
    message.className = "photo-unavailable";
    message.textContent = "Foto no disponible. Puedes verla en el enlace de créditos.";
    img.insertAdjacentElement("afterend", message);
  };
  img.addEventListener("error", showFailure, { once: true });
  if (img.complete && !img.naturalWidth) showFailure();
}
$("[data-route-index]").innerHTML = STOPS.map((stop, i) => `<a href="#parada-${stop.id}" data-index-id="${stop.id}"><span>${String(i + 1).padStart(2, "0")}</span>${e(stop.shortName)}</a>`).join("");
$("[data-interior-choices]").innerHTML = INTERIORS.map((item) => `<label class="interior-choice"><input type="checkbox" value="${item.id}" data-interior-choice${state.interiors.includes(item.id) ? " checked" : ""}/><span>${e(item.name)}</span><strong>${euro(item.price)}</strong></label>`).join("");

function updateVisited() {
  for (const stop of STOPS) {
    const visited = state.visited.includes(stop.id);
    const article = document.getElementById(`parada-${stop.id}`);
    article.classList.toggle("is-visited", visited);
    const button = $("[data-visit]", article); button.setAttribute("aria-pressed", String(visited));
    $("[data-visit-label]", button).textContent = visited ? "Visitada · quitar marca" : "Marcar como visitada";
    $(`[data-index-id="${stop.id}"]`).classList.toggle("is-visited", visited);
  }
  $("[data-progress]").textContent = `${state.visited.length} de ${STOPS.length}`;
  $("[data-progress-bar]").style.width = `${state.visited.length / STOPS.length * 100}%`;
}
function updateBudget() {
  const selected = INTERIORS.filter((item) => state.interiors.includes(item.id));
  const total = selected.reduce((sum, item) => sum + item.price, 0);
  const extra = selected.filter((item) => !item.base).reduce((sum, item) => sum + item.minutes, 0);
  $("[data-budget-total]").textContent = euro(total);
  $("[data-budget-description]").textContent = selected.length ? `${selected.length} ${selected.length === 1 ? "visita" : "visitas"}. ${extra ? `Reserva unos ${Math.round(extra / 15) * 15} min más para estas visitas.` : "Incluye la Lonja."} Precios generales por adulto. Comidas aparte.` : "Solo el paseo, sin visitas de pago.";
  document.querySelectorAll("[data-interior-ref]").forEach((element) => {
    const isSelected = state.interiors.includes(element.dataset.interiorRef);
    element.classList.toggle("is-selected", isSelected); $("[data-selected-label]", element).hidden = !isSelected;
  });
}
$("[data-interior-choices]").addEventListener("change", (event) => {
  const input = event.target.closest("[data-interior-choice]"); if (!input) return;
  state.interiors = input.checked ? [...state.interiors, input.value] : state.interiors.filter((id) => id !== input.value);
  writeStorage(KEYS.interiors, state.interiors); updateBudget();
});
updateVisited(); updateBudget();

const mapDialog = $("[data-map-dialog]");
let pendingMap = null;
function showMapDialog(action = null, destination = null) {
  pendingMap = destination ? { action, destination } : null;
  $("[data-map-destination]").textContent = destination ? `Destino: ${destination.name}. Elige cómo abrirlo.` : "Elige un mapa para el paseo o decide en cada parada.";
  mapDialog.showModal();
}
async function copyDestination(destination) {
  const coordinates = `${destination.coordinates.lat}, ${destination.coordinates.lng}`;
  try { await navigator.clipboard.writeText(coordinates); announce(`Coordenadas copiadas: ${destination.name}.`); }
  catch { const result = window.prompt(`Copia las coordenadas de ${destination.name}`, coordinates); announce(result === null ? "Copia cancelada." : "Coordenadas disponibles para copiar."); }
}
function launch(action, destination) {
  if (!destination) return;
  if (state.provider === "ask") showMapDialog(action, destination);
  else if (state.provider === "copy") copyDestination(destination);
  else window.location.assign(mapUrl(state.provider, action, destination));
}
$("[data-settings]").addEventListener("click", () => showMapDialog());
$("[data-start-map]").addEventListener("click", () => launch("place", ROUTE.start));
mapDialog.addEventListener("click", (event) => {
  const provider = event.target.closest("[data-provider]")?.dataset.provider;
  if (!provider) return;
  state.provider = provider; writeStorage(KEYS.provider, provider);
  if (provider === "ask" && pendingMap) {
    $("[data-map-destination]").textContent = `Elegirás un mapa en cada parada. Para continuar, elige dónde abrir ${pendingMap.destination.name}.`; return;
  }
  const pending = pendingMap; mapDialog.close();
  if (pending) launch(pending.action, pending.destination);
  else announce("Hemos guardado tu elección de mapa.");
});
mapDialog.addEventListener("close", () => { pendingMap = null; });
const glossaryDialog = $("[data-glossary-dialog]");
let glossaryTrigger;
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const visit = event.target.closest("[data-visit]");
  if (visit) {
    const id = visit.dataset.visit;
    state.visited = state.visited.includes(id) ? state.visited.filter((entry) => entry !== id) : [...state.visited, id];
    writeStorage(KEYS.visited, state.visited); updateVisited(); return;
  }
  const place = event.target.closest("[data-place]"); const next = event.target.closest("[data-next]");
  if (place || next) { const action = place ? "place" : "next"; launch(action, destinationFor(action, (place || next).dataset[place ? "place" : "next"])); return; }
  const glossary = event.target.closest("[data-glossary]");
  if (glossary) {
    const entry = GLOSSARY.find((item) => item.key === glossary.dataset.glossary); if (!entry) return;
    glossaryTrigger = glossary; $("[data-glossary-title]").textContent = entry.title; $("[data-glossary-definition]").textContent = entry.definition;
    glossaryDialog.showModal();
  }
});
glossaryDialog.addEventListener("close", () => { glossaryTrigger?.focus({ preventScroll: true }); });
for (const dialog of [mapDialog, glossaryDialog]) dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
$("[data-download-gpx]").addEventListener("click", downloadGpx);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    const entry = entries.filter((item) => item.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!entry) return;
    const id = entry.target.dataset.stopId;
    $("[data-current-label]").textContent = STOPS.find((stop) => stop.id === id).shortName;
    document.querySelectorAll("[data-index-id]").forEach((link) => {
      const active = link.dataset.indexId === id;
      link.classList.toggle("is-current", active);
      if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-20% 0px -55% 0px", threshold: 0 });
  document.querySelectorAll("[data-stop-id]").forEach((article) => observer.observe(article));
}
mountWeather($("[data-weather]"));
if ("serviceWorker" in navigator) window.addEventListener("load", async () => {
  try {
    await navigator.serviceWorker.register("sw.js");
    await navigator.serviceWorker.ready;
    $("[data-offline-status]").textContent = "Ya puedes leer esta guía sin conexión. Las fotos se guardan al verlas; conéctate para cargar las que falten y actualizar el tiempo.";
  } catch { $("[data-offline-status]").textContent = "La guía está disponible mientras tengas conexión. No hemos podido guardarla para usarla sin internet."; }
});
