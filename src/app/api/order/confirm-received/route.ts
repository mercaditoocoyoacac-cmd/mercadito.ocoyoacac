import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { revalidatePath } from "next/cache";
import { appendStatusTimestamp } from "@/lib/statusTimestamps";
import { notifyCustomerOrderCompleted } from "@/server/notifications";

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
        OR: [
          { pickupCode: code.toUpperCase(), userId: auth.userId },
          { deliveryCode: code.toUpperCase(), userId: auth.userId },
        ],
      },
    });
  }

  if (!order) {
    return NextResponse.json({ ok: false, error: "Orden no encontrada" }, { status: 404 });
  }

  const isDeliveryReadyToReceive =
    order.fulfillmentType === "DELIVERY" && order.status === "OUT_FOR_DELIVERY";
  const isPickupReadyToReceive =
    order.fulfillmentType === "PICKUP" && order.status === "READY";

  if (!isDeliveryReadyToReceive && !isPickupReadyToReceive) {
    return NextResponse.json(
      { ok: false, error: "Tu pedido aún no está listo para cerrarse" },
      { status: 400 },
    );
  }

  const currentTs = order.statusTimestamps as Record<string, string> | null;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "COMPLETED",
      statusTimestamps: appendStatusTimestamp(currentTs, "COMPLETED"),
    },
  });

  await notifyCustomerOrderCompleted(order.id);

  revalidatePath(`/mis-pedidos/${order.id}`);
  revalidatePath(`/pedido/${order.id}`);
  revalidatePath(`/vendor/pedidos/${order.id}`);
  revalidatePath("/vendor/pedidos");
  revalidatePath("/admin/pedidos");

  return NextResponse.json({ ok: true, orderId: order.id });
}