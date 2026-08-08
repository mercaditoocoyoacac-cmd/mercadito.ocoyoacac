import { NextResponse } from "next/server";
import { requireUser } from "@/server/requireUser";
import { rateLimit, getClientIP } from "@/server/rateLimit";
import { getRouteDistanceKm } from "@/server/directions";
import { haversineDistance } from "@/lib/geo";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const ip = getClientIP(req);
  if (!rateLimit(`route-dist:${ip}`).success) {
    return NextResponse.json({ ok: false, error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const storeLat = Number(searchParams.get("storeLat"));
  const storeLng = Number(searchParams.get("storeLng"));
  const customerLat = Number(searchParams.get("customerLat"));
  const customerLng = Number(searchParams.get("customerLng"));
  if (![storeLat, storeLng, customerLat, customerLng].every(Number.isFinite)) {
    return NextResponse.json({ ok: false, error: "Coordenadas inválidas" }, { status: 400 });
  }

  const routeKm = await getRouteDistanceKm(storeLat, storeLng, customerLat, customerLng);
  const straightKm = haversineDistance(storeLat, storeLng, customerLat, customerLng);

  return NextResponse.json({ ok: true, routeKm, straightKm });
}
