import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { RISK_ZONE_EXTRA_CENTS } from "@/lib/geo";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const zones = await prisma.deliveryZone.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ ok: true, zones });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  if (!json?.name || !json?.polygon) {
    return NextResponse.json({ ok: false, error: "Faltan campos requeridos: name, polygon" }, { status: 400 });
  }

  const zone = await prisma.deliveryZone.create({
    data: {
      name: json.name,
      color: "#ef4444",
      priceCents: RISK_ZONE_EXTRA_CENTS,
      polygon: json.polygon,
      isActive: json.isActive ?? true,
      sortOrder: json.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ ok: true, zone });
}
