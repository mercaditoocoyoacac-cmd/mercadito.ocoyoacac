import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

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
  if (!json?.name || !json?.polygon || json.priceCents == null) {
    return NextResponse.json({ ok: false, error: "Faltan campos requeridos: name, polygon, priceCents" }, { status: 400 });
  }

  const zone = await prisma.deliveryZone.create({
    data: {
      name: json.name,
      color: json.color || "#22c55e",
      priceCents: json.priceCents,
      polygon: json.polygon,
      isActive: json.isActive ?? true,
      sortOrder: json.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ ok: true, zone });
}
