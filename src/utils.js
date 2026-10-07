export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
export function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export function scrollToElement(element) {
  element?.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
}
export const euro = (value) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
