import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ ok: false, error: "Tienda no encontrada" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const { orders } = json || {};

  if (!Array.isArray(orders) || orders.length === 0) {
    return NextResponse.json({ ok: false, error: "Lista de órdenes inválida" }, { status: 400 });
  }

  const validIds = new Set(
    (await prisma.product.findMany({
      where: { storeId: store.id },
      select: { id: true },
    })).map(p => p.id)
  );

  const updates = orders
    .filter(o => typeof o.id === "string" && typeof o.sortOrder === "number" && validIds.has(o.id))
    .map(o => prisma.product.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } }));

  if (updates.length === 0) {
    return NextResponse.json({ ok: false, error: "No hay productos válidos para reordenar" }, { status: 400 });
  }

  await prisma.$transaction(updates);

  return NextResponse.json({ ok: true });
}
