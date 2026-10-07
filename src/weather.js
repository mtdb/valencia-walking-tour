import { escapeHtml, readStorage, writeStorage, prefersReducedMotion } from "./utils.js";

export const WEATHER_ZONE = "Europe/Madrid";
export const WEATHER_KEY = "valencia-tour:weather-v1";
export const FRESH_MS = 30 * 60 * 1000;
export const MAX_CACHE_MS = 48 * 60 * 60 * 1000;
export const WEATHER_URL = (() => {
  const params = new URLSearchParams({ latitude: "39.475", longitude: "-0.376", timezone: WEATHER_ZONE, forecast_days: "7", temperature_unit: "celsius", wind_speed_unit: "kmh", precipitation_unit: "mm", hourly: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,is_day", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
})();

export function valenciaNow(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: WEATHER_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), time: `${parts.hour}:${parts.minute}` };
}
export function calendarLabel(date, options = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("es-ES", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
const numeric = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
export function parseForecast(payload) {
  if (!payload || payload.timezone !== WEATHER_ZONE || !payload.hourly || !payload.daily) throw new Error("Invalid forecast");
  const hourlyKeys = ["temperature_2m", "apparent_temperature", "precipitation_probability", "weather_code", "wind_speed_10m", "is_day"];
  const dailyKeys = ["temperature_2m_max", "temperature_2m_min", "precipitation_probability_max", "weather_code"];
  const hours = payload.hourly.time;
  const dates = payload.daily.time;
  if (!Array.isArray(hours) || !hours.length || !Array.isArray(dates) || !dates.length || dates.length > 16 || hours.length > 500) throw new Error("Missing forecast times");
  for (const key of hourlyKeys) if (!Array.isArray(payload.hourly[key]) || payload.hourly[key].length !== hours.length) throw new Error("Incomplete hourly forecast");
  for (const key of dailyKeys) if (!Array.isArray(payload.daily[key]) || payload.daily[key].length !== dates.length) throw new Error("Incomplete daily forecast");
  if (payload.hourly_units?.temperature_2m !== "°C" || payload.hourly_units?.wind_speed_10m !== "km/h" || payload.hourly_units?.precipitation_probability !== "%") throw new Error("Unexpected units");
  if (new Set(dates).size !== dates.length) throw new Error("Duplicate days");
  const days = dates.map((date, i) => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error("Invalid date");
    return { date, min: numeric(payload.daily.temperature_2m_min[i]), max: numeric(payload.daily.temperature_2m_max[i]), rain: numeric(payload.daily.precipitation_probability_max[i]), code: numeric(payload.daily.weather_code[i]), hours: [] };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));
  hours.forEach((time, i) => {
    if (typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(time)) throw new Error("Invalid hour");
    const day = byDate.get(time.slice(0, 10));
    if (!day) throw new Error("Hour outside daily forecast");
    const rain = numeric(payload.hourly.precipitation_probability[i]);
    day.hours.push({ time, hour: Number(time.slice(11, 13)), temperature: numeric(payload.hourly.temperature_2m[i]), feelsLike: numeric(payload.hourly.apparent_temperature[i]), rain: rain !== null && rain >= 0 && rain <= 100 ? rain : null, wind: numeric(payload.hourly.wind_speed_10m[i]), code: numeric(payload.hourly.weather_code[i]), isDay: payload.hourly.is_day[i] === 1 });
  });
  if (days.some((day) => !day.hours.length || !day.hours.some((hour) => hour.temperature !== null))) throw new Error("Empty forecast day");
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

export function weatherCondition(code, isDay = true) {
  if (code === 0) return { icon: isDay ? "sun" : "moon", label: isDay ? "Despejado" : "Noche despejada" };
  if (code === 1 || code === 2) return { icon: isDay ? "partly" : "cloud", label: code === 1 ? "Poco nuboso" : "Parcialmente nuboso" };
  if (code === 3) return { icon: "cloud", label: "Cubierto" };
  if (code === 45 || code === 48) return { icon: "fog", label: "Niebla" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "rain", label: "Llovizna" };
  if ([61, 63, 65, 66, 67].includes(code)) return { icon: "rain", label: "Lluvia" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "snow", label: "Nieve" };
  if ([80, 81, 82].includes(code)) return { icon: "rain", label: "Chubascos" };
  if ([95, 96, 99].includes(code)) return { icon: "storm", label: "Tormenta" };
  return { icon: "unknown", label: "Previsión no disponible" };
}

const icons = {
  sun: '<circle cx="24" cy="24" r="8"/><path d="M24 4v5m0 30v5M4 24h5m30 0h5M10 10l4 4m20 20 4 4M38 10l-4 4M14 34l-4 4"/>',
  moon: '<path d="M31 7a18 18 0 1 0 10 28A19 19 0 0 1 31 7Z"/>',
  cloud: '<path d="M11 34a9 9 0 0 1-1-18 12 12 0 0 1 23-2 10 10 0 0 1 4 20Z"/>',
  partly: '<circle cx="16" cy="15" r="8"/><path d="M16 2v3M3 15h3M6 5l3 3m19-3-3 3M17 37a8 8 0 0 1 0-16 10 10 0 0 1 19 1 8 8 0 0 1 0 15Z"/>',
  rain: '<path d="M10 27a7 7 0 0 1 0-14 11 11 0 0 1 21-1 8 8 0 0 1 4 15ZM15 33l-3 7m14-7-3 7m14-7-3 7"/>',
  storm: '<path d="M10 27a7 7 0 0 1 0-14 11 11 0 0 1 21-1 8 8 0 0 1 4 15ZM25 25l-9 13h8l-2 8 12-15h-9l3-6"/>',
  snow: '<path d="M10 27a7 7 0 0 1 0-14 11 11 0 0 1 21-1 8 8 0 0 1 4 15ZM16 33v10m-4-8 8 6m0-6-8 6m21-8v10m-4-8 8 6m0-6-8 6"/>',
  fog: '<path d="M10 25a7 7 0 0 1 0-14 11 11 0 0 1 21-1 8 8 0 0 1 4 15ZM6 32h36M10 39h28"/>',
  unknown: '<circle cx="24" cy="24" r="17"/><path d="M18 19c0-8 13-8 13 0 0 5-7 4-7 10m0 5v1"/>',
};
export const weatherIcon = (kind) => `<svg class="weather-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[kind] ?? icons.unknown}</svg>`;
const degree = (value) => value === null ? "—" : `${Math.round(value)}°`;

export function validCache(record, date = new Date()) {
  const age = date.getTime() - record?.savedAt;
  if (!Number.isFinite(age) || age < -60_000 || age > MAX_CACHE_MS || record?.version !== 1) return null;
  try {
    const days = parseForecast(record.payload);
    if (!days.some((day) => day.date === valenciaNow(date).date)) return null;
    return { days, savedAt: record.savedAt, payload: record.payload, fresh: age < FRESH_MS };
  } catch { return null; }
}

export async function fetchForecast({ fetcher = globalThis.fetch, timeoutMs = 10_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(WEATHER_URL, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error("Weather request failed");
    const payload = await response.json();
    return { payload, days: parseForecast(payload) };
  } finally { clearTimeout(timer); }
}

export function mountWeather(root) {
  let days = [], selected = valenciaNow().date, savedAt = 0, stale = false, busy = false;
  let lastDate = selected, lastRenderHour = valenciaNow().hour;
  const body = root.querySelector("[data-weather-body]");
  const status = root.querySelector("[data-weather-status]");
  const retry = root.querySelector("[data-weather-refresh]");
  const setStatus = (text) => { if (status.textContent !== text) status.textContent = text; };

  function render({ focusDay = false, scrollHours = false } = {}) {
    const now = valenciaNow();
    const available = days.filter((day) => day.date >= now.date).slice(0, 7);
    if (!available.some((day) => day.date === now.date)) { days = []; renderEmpty(); return; }
    if (!available.some((day) => day.date === selected)) selected = now.date;
    const day = available.find((item) => item.date === selected);
    const condition = weatherCondition(day.code);
    const rain = day.rain === null ? "Probabilidad de lluvia no disponible" : `Mayor probabilidad de lluvia del día: ${Math.round(day.rain)} %`;
    body.innerHTML = `<div class="weather-days" role="group" aria-label="Elige el día de la previsión">${available.map((item, index) => `<button type="button" class="weather-day" data-weather-day="${item.date}" aria-pressed="${item.date === selected}" aria-label="${escapeHtml(calendarLabel(item.date))}"><span>${index === 0 ? "Hoy" : calendarLabel(item.date, { weekday: "short" })}</span><small>${calendarLabel(item.date, { day: "numeric", month: "short" })}</small></button>`).join("")}</div>
      <div class="weather-overview"><div class="weather-overview__sky">${weatherIcon(condition.icon)}<div><p class="weather-date">${escapeHtml(calendarLabel(day.date))}</p><h3>${escapeHtml(condition.label)}</h3></div></div><div class="weather-range"><strong>${degree(day.max)}</strong><span>/ ${degree(day.min)}</span><small>máx. / mín.</small></div></div>
      <div class="weather-hourly-heading"><p>${rain}</p><div><button type="button" class="round-button" data-hours-direction="-1" aria-label="Ver horas anteriores">←</button><button type="button" class="round-button" data-hours-direction="1" aria-label="Ver horas siguientes">→</button></div></div>
      <div class="weather-hours" tabindex="0" role="region" aria-label="Previsión por horas: temperatura, sensación, lluvia y viento. Desliza o usa las flechas."><ol>${day.hours.map((hour) => {
        const sky = weatherCondition(hour.code, hour.isDay);
        const current = day.date === now.date && hour.hour === now.hour;
        const past = day.date === now.date && hour.hour < now.hour;
        return `<li class="weather-hour${current ? " is-current" : ""}${past ? " is-past" : ""}"${current ? ' aria-current="time"' : ""}><span class="weather-hour__time">${current ? "Ahora" : hour.time.slice(11)}<small>${current ? hour.time.slice(11) : sky.label}</small></span>${weatherIcon(sky.icon)}<strong>${degree(hour.temperature)}</strong><span class="weather-hour__feels">Sensación ${degree(hour.feelsLike)}</span><span class="weather-hour__rain" title="Probabilidad de precipitación">${hour.rain === null ? "—" : Math.round(hour.rain) + " %"}<small>lluvia</small></span><span class="weather-hour__wind">${hour.wind === null ? "Viento: sin datos" : Math.round(hour.wind) + " km/h"}</span></li>`;
      }).join("")}</ol></div><p class="weather-hint">Hora local de Valencia. Desliza o usa las flechas para ver el resto del día.</p>`;
    const stamp = new Intl.DateTimeFormat("es-ES", { timeZone: WEATHER_ZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(savedAt));
    setStatus(`${stale ? "Previsión guardada · no se ha podido actualizar" : "Previsión consultada"}: ${stamp}.`);
    root.classList.toggle("is-stale", stale);
    root.removeAttribute("aria-busy");
    if (focusDay) body.querySelector(`[data-weather-day="${selected}"]`)?.focus({ preventScroll: true });
    if (scrollHours) {
      const hours = body.querySelector(".weather-hours");
      const target = body.querySelector(day.date === now.date ? ".weather-hour.is-current" : ".weather-hour:nth-child(9)");
      if (target) hours.scrollLeft = target.offsetLeft - hours.offsetLeft;
    }
  }
  function renderEmpty() {
    root.removeAttribute("aria-busy");
    root.classList.remove("is-stale");
    setStatus("No hemos podido cargar la previsión.");
    body.innerHTML = '<div class="weather-empty"><span aria-hidden="true">↗</span><p>El tiempo no está disponible ahora.</p><small>Pulsa «Actualizar» para volver a intentarlo o consulta <a href="https://www.aemet.es/es/eltiempo/prediccion/municipios/valencia-id46250" target="_blank" rel="noreferrer">AEMET para Valencia</a>.</small></div>';
  }
  async function refresh(force = false) {
    if (busy) return;
    const cached = validCache(readStorage(WEATHER_KEY, null));
    if (!force && cached?.fresh) {
      days = cached.days; savedAt = cached.savedAt; stale = !navigator.onLine; render({ scrollHours: true }); return;
    }
    if (cached && !days.length) { days = cached.days; savedAt = cached.savedAt; stale = true; render({ scrollHours: true }); }
    busy = true; retry.disabled = true; root.setAttribute("aria-busy", "true");
    setStatus("Consultando la previsión para Valencia…");
    try {
      const result = await fetchForecast();
      if (!result.days.some((day) => day.date === valenciaNow().date)) throw new Error("Forecast does not cover today");
      days = result.days; savedAt = Date.now(); stale = false;
      writeStorage(WEATHER_KEY, { version: 1, savedAt, payload: result.payload });
      render({ scrollHours: true });
    } catch {
      const fallback = validCache(readStorage(WEATHER_KEY, null)) ?? validCache({ version: 1, savedAt, payload: cached?.payload });
      if (fallback) { days = fallback.days; savedAt = fallback.savedAt; stale = true; render({ scrollHours: true }); }
      else if (days.some((day) => day.date === valenciaNow().date) && Date.now() - savedAt <= MAX_CACHE_MS) { stale = true; render({ scrollHours: true }); }
      else { days = []; renderEmpty(); }
    } finally { busy = false; retry.disabled = false; root.removeAttribute("aria-busy"); }
  }
  retry.addEventListener("click", () => refresh(true));
  body.addEventListener("click", (event) => {
    const button = event.target.closest("[data-weather-day]");
    if (button) { selected = button.dataset.weatherDay; render({ focusDay: true, scrollHours: true }); }
    const direction = event.target.closest("[data-hours-direction]");
    if (direction) body.querySelector(".weather-hours").scrollBy({ left: Number(direction.dataset.hoursDirection) * 420, behavior: prefersReducedMotion() ? "instant" : "smooth" });
  });
  body.addEventListener("keydown", (event) => {
    const button = event.target.closest("[data-weather-day]");
    if (!button || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...body.querySelectorAll("[data-weather-day]")];
    const index = buttons.indexOf(button);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    selected = buttons[next].dataset.weatherDay; render({ focusDay: true, scrollHours: true });
  });
  function tick() {
    const now = valenciaNow();
    if (now.date !== lastDate) {
      lastDate = now.date; selected = now.date;
      if (days.length) render({ scrollHours: true });
      refresh(true);
    } else if (now.hour !== lastRenderHour && days.length) {
      const active = document.activeElement;
      const dayFocused = active?.hasAttribute("data-weather-day");
      if (!root.contains(active) || dayFocused) render({ focusDay: dayFocused });
    }
    lastRenderHour = now.hour;
  }
  const timer = setInterval(tick, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { tick(); refresh(); }
  });
  window.addEventListener("online", () => refresh(true));
  window.addEventListener("offline", () => {
    if (days.length) { stale = true; render(); }
  });
  refresh();
  return { refresh, stop: () => clearInterval(timer) };
}
