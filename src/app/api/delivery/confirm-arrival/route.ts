import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const userId = auth.userId;

  const json = await req.json().catch(() => null);
  const { orderId } = json || {};

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requerido" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { arrivedAt: true, arrivalConfirmedAt: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  if (!order.arrivedAt) {
    return NextResponse.json({ ok: false, error: "El repartidor aún no ha llegado" }, { status: 400 });
  }

  if (order.arrivalConfirmedAt) {
    return NextResponse.json({ ok: false, error: "Ya confirmaste la llegada" }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { arrivalConfirmedAt: new Date() },
  });

  revalidatePath(`/mis-pedidos/${orderId}`);
  revalidatePath("/delivery");

  return NextResponse.json({ ok: true });
}
