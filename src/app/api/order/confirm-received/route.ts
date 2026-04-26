import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const { orderId, code } = json || {};

  let order = null;

  if (orderId) {
    order = await prisma.order.findFirst({
      where: { id: orderId, userId: auth.userId },
    });
  } else if (code) {
    order = await prisma.order.findFirst({
      where: { 
        deliveryCode: code.toUpperCase(),
        userId: auth.userId,
      },
    });
  }

  if (!order) {
    return NextResponse.json({ ok: false, error: "Orden no encontrada" }, { status: 404 });
  }

  if (order.status !== "OUT_FOR_DELIVERY") {
    return NextResponse.json({ ok: false, error: "El pedido no está en camino" }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "COMPLETED" },
  });

  return NextResponse.json({ ok: true, orderId: order.id });
}