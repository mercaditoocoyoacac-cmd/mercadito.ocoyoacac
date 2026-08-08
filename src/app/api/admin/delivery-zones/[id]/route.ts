import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { RISK_ZONE_EXTRA_CENTS } from "@/lib/geo";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const existing = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Zona no encontrada" }, { status: 404 });
  }

  const zone = await prisma.deliveryZone.update({
    where: { id },
    data: {
      name: json.name ?? existing.name,
      color: "#ef4444",
      priceCents: RISK_ZONE_EXTRA_CENTS,
      polygon: json.polygon ?? existing.polygon,
      isActive: json.isActive ?? existing.isActive,
      sortOrder: json.sortOrder ?? existing.sortOrder,
    },
  });

  return NextResponse.json({ ok: true, zone });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const existing = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Zona no encontrada" }, { status: 404 });
  }

  await prisma.deliveryZone.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
