import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { storeId, orders } = json || {};

  if (!storeId || !Array.isArray(orders) || orders.length === 0) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const validIds = new Set(
    (await prisma.product.findMany({
      where: { storeId },
      select: { id: true },
    })).map(p => p.id)
  );

  const updates = orders
    .filter(o => typeof o.id === "string" && typeof o.sortOrder === "number" && validIds.has(o.id))
    .map(o => prisma.product.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } }));

  if (updates.length === 0) {
    return NextResponse.json({ ok: false, error: "No hay productos válidos" }, { status: 400 });
  }

  await prisma.$transaction(updates);
  return NextResponse.json({ ok: true });
}
