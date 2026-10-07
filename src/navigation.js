import { ROUTE, STOPS } from "./tour-data.js";

export const PROVIDERS = ["ask", "google", "osmand", "copy"];
export function destinationFor(action, id) {
  const index = STOPS.findIndex((stop) => stop.id === id);
  if (index === -1) return null;
  if (action === "place") return STOPS[index];
  if (action === "next") return STOPS[index + 1] ?? ROUTE.end;
  if (action === "return") return ROUTE.end;
  return null;
}
export function mapUrl(provider, action, destination) {
  const { lat, lng } = destination.coordinates;
  if (provider === "osmand") {
    return action === "place" ? `https://osmand.net/map/?pin=${lat},${lng}#18/${lat}/${lng}` : `https://osmand.net/map/navigate/?finish=${lat},${lng}&type=osmand&profile=pedestrian`;
  }
  const query = encodeURIComponent(destination.mapQuery || `${lat},${lng}`);
  return action === "place" ? `https://www.google.com/maps/search/?api=1&query=${query}` : `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=walking`;
}
