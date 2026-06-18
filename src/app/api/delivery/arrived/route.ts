import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { sendTextNotification } from "@/server/notifications";
import { sendWhatsAppMessage } from "@/server/whatsapp";
import { sendSMS } from "@/server/sns";

export async function POST(req: Request) {
  const auth = await requireRole("DELIVERY");
  if (!auth.ok) return auth.res;

  const userId = auth.userId;

  const json = await req.json().catch(() => null);
  const { orderId } = json || {};

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requerido" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, deliveryUserId: userId },
    include: { store: { select: { name: true } } },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.status !== "OUT_FOR_DELIVERY") {
    return NextResponse.json({ ok: false, error: "El pedido no está en camino" }, { status: 400 });
  }

  if (order.arrivedAt) {
    return NextResponse.json({ ok: false, error: "Ya notificaste tu llegada" }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { arrivedAt: new Date() },
  });

  revalidatePath(`/mis-pedidos/${orderId}`);
  revalidatePath(`/vendor/pedidos/${orderId}`);
  revalidatePath("/vendor/pedidos");
  revalidatePath("/delivery");

  await sendTextNotification(order.userId, {
    title: "Repartidor llegó",
    body: `¡El repartidor ya está en tu domicilio! Sal a recibir tu pedido de ${order.store.name}.`,
    type: "DELIVERY_ARRIVED",
    url: `/mis-pedidos/${orderId}`,
  });

  const message = `🛵 ¡El repartidor de ${order.store.name} ya está en tu domicilio! Sal a recibir tu pedido.`;
  await Promise.allSettled([
    sendWhatsAppMessage(order.customerPhone, message),
    sendSMS(order.customerPhone, message.replace(/[^\w\sáéíóúñ,.!¡¿?]/g, "")),
  ]);

  return NextResponse.json({ ok: true });
}
