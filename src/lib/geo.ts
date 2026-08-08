const EARTH_RADIUS_KM = 6371;
const BASE_FEE_CENTS = 2500;
const EXTRA_FEE_PER_SEGMENT_CENTS = 1000;
const BASE_DISTANCE_KM = 2;
const SEGMENT_KM = 2;

export interface DeliveryFeeConfig {
  baseFeeCents?: number;
  extraFeePerSegmentCents?: number;
  baseDistanceKm?: number;
  segmentKm?: number;
  fallbackFeeCents?: number;
}

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

export function calcDeliveryFeeCents(distanceKm: number, config?: DeliveryFeeConfig): number {
  const baseFee = config?.baseFeeCents ?? BASE_FEE_CENTS;
  const extraFee = config?.extraFeePerSegmentCents ?? EXTRA_FEE_PER_SEGMENT_CENTS;
  const baseDist = config?.baseDistanceKm ?? BASE_DISTANCE_KM;
  const segment = config?.segmentKm ?? SEGMENT_KM;
  if (distanceKm <= 0) return baseFee;
  if (distanceKm <= baseDist) return baseFee;
  const extraSegments = Math.ceil((distanceKm - baseDist) / segment);
  return baseFee + extraSegments * extraFee;
}

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const Cap = (window as any).Capacitor;
    return Cap && typeof Cap.isNativePlatform === "function" && Cap.isNativePlatform();
  } catch {
    return false;
  }
}

function getMapsProtocolUrl(lat: number | null | undefined, lng: number | null | undefined, address: string | null | undefined): string {
  if (lat && lng) return `geo:${lat},${lng}?q=${lat},${lng}`;
  if (address) return `geo:0,0?q=${encodeURIComponent(address)}`;
  return "geo:0,0?q=Mercadito+Ocoyoacac";
}

export function getMapsUrl(lat: number | null | undefined, lng: number | null | undefined, address: string | null | undefined): string {
  if (isNativeApp()) return getMapsProtocolUrl(lat, lng, address);
  if (lat && lng) return `https://www.google.com/maps?q=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
  return "https://www.google.com/maps";
}

/**
 * Point-in-polygon using ray casting algorithm.
 * Returns true if the point (lat, lng) is inside the polygon.
 */
export function pointInPolygon(
  lat: number,
  lng: number,
  polygon: { lat: number; lng: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function openMapsUrl(url: string): void {
  if (isNativeApp()) {
    window.open(url, "_system");
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
