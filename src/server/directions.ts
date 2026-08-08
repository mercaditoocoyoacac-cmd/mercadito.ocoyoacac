const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

const cache = new Map<string, { km: number; expiresAt: number }>();

function cacheKey(aLat: number, aLng: number, bLat: number, bLng: number): string {
  return [aLat.toFixed(4), aLng.toFixed(4), bLat.toFixed(4), bLng.toFixed(4)].join(",");
}

function withTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchRoutesApi(key: string, aLat: number, aLng: number, bLat: number, bLng: number): Promise<number | null> {
  const res = await withTimeout(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
        "x-goog-fieldmask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: aLat, longitude: aLng } } },
        destination: { location: { latLng: { latitude: bLat, longitude: bLng } } },
        travelMode: "DRIVE",
      }),
    },
    FETCH_TIMEOUT_MS,
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (data?.routes?.[0]?.distanceMeters == null) return null;
  return data.routes[0].distanceMeters / 1000;
}

async function fetchDirectionsLegacy(key: string, aLat: number, aLng: number, bLat: number, bLng: number): Promise<number | null> {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${aLat},${aLng}&destination=${bLat},${bLng}&mode=driving&key=${encodeURIComponent(key)}`;
  const res = await withTimeout(url, {}, FETCH_TIMEOUT_MS);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (data?.status !== "OK" || data?.routes?.[0]?.legs?.[0]?.distance?.value == null) return null;
  return data.routes[0].legs[0].distance.value / 1000;
}

/**
 * Returns the real driving route distance in km between two points.
 * Tries the Routes API (New) first, then falls back to Directions API (legacy).
 * Returns null when unavailable (API not enabled, quota, timeout, no route) —
 * callers should fall back to straight-line distance.
 */
export async function getRouteDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<number | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY_SERVER || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return null;

  const ck = cacheKey(originLat, originLng, destLat, destLng);
  const hit = cache.get(ck);
  if (hit && hit.expiresAt > Date.now()) return hit.km;

  const km =
    (await fetchRoutesApi(key, originLat, originLng, destLat, destLng)) ??
    (await fetchDirectionsLegacy(key, originLat, originLng, destLat, destLng));

  if (km == null) return null;
  cache.set(ck, { km, expiresAt: Date.now() + CACHE_TTL_MS });
  return km;
}
