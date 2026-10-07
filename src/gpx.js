import { WAYPOINTS, ROUTE } from "./tour-data.js";
import { escapeHtml } from "./utils.js";

export function createGpx(points = WAYPOINTS) {
  const rows = points.map((point) => `  <wpt lat="${point.coordinates.lat}" lon="${point.coordinates.lng}"><name>${escapeHtml(point.name)}</name></wpt>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="València a pie" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${escapeHtml(ROUTE.name)}</name><desc>Paradas del paseo en orden. Sigue las indicaciones de la guía para caminar entre ellas.</desc></metadata>\n${rows}\n</gpx>`;
}
export function downloadGpx() {
  const url = URL.createObjectURL(new Blob([createGpx()], { type: "application/gpx+xml" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: "valencia-puntos-del-paseo.gpx" });
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
