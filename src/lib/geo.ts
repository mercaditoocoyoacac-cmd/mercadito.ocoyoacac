const EARTH_RADIUS_KM = 6371;
const BASE_FEE_CENTS = 2500;
const EXTRA_FEE_PER_SEGMENT_CENTS = 1000;
const BASE_DISTANCE_KM = 2;
const SEGMENT_KM = 2;

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function calcDeliveryFeeCents(distanceKm: number): number {
  if (distanceKm <= 0) return BASE_FEE_CENTS;
  if (distanceKm <= BASE_DISTANCE_KM) return BASE_FEE_CENTS;
  const extraSegments = Math.ceil((distanceKm - BASE_DISTANCE_KM) / SEGMENT_KM);
  return BASE_FEE_CENTS + extraSegments * EXTRA_FEE_PER_SEGMENT_CENTS;
}

function isCapacitor(): boolean {
  return typeof window !== "undefined" && typeof (window as any).Capacitor !== "undefined";
}

export function getMapsUrl(lat: number | null | undefined, lng: number | null | undefined, address: string | null | undefined): string {
  if (isCapacitor()) {
    if (lat && lng) return `geo:${lat},${lng}?q=${lat},${lng}`;
    if (address) return `geo:0,0?q=${encodeURIComponent(address)}`;
    return "geo:0,0?q=Mercadito+Ocoyoacac";
  }
  if (lat && lng) return `https://www.google.com/maps?q=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
  return "https://www.google.com/maps";
}

export function openMapsUrl(url: string): void {
  if (isCapacitor()) {
    window.open(url, "_system");
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
