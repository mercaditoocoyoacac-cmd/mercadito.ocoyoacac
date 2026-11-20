import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { notifyOrderCancelled } from "@/server/orderNotifications";
import { getCancellationBlockMessage } from "@/lib/orderCancellation";
import { appendStatusTimestamp } from "@/lib/statusTimestamps";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { orderId, reason } = await req.json().catch(() => ({}));
  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
  }
  const reasonText = typeof reason === "string" ? reason.trim() : "";
  if (reasonText.length < 3) {
    return NextResponse.json(
      { error: "Debes indicar el motivo de cancelación." },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: auth.userId },
    select: {
      id: true,
      status: true,
      statusTimestamps: true,
      items: { select: { productId: true, quantity: true, weightGrams: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const blockMessage = getCancellationBlockMessage(order.status);
  if (blockMessage) {
    return NextResponse.json({ error: blockMessage }, { status: 400 });
  }

  const currentTs = order.statusTimestamps as Record<string, string> | null;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelReason: reasonText,
        statusTimestamps: appendStatusTimestamp(currentTs, "CANCELLED"),
      },
    });

    for (const item of order.items) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });

      if (product && product.stock !== null && product.stock !== -1) {
        const increment = item.weightGrams
          ? item.weightGrams * item.quantity
          : item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment } },
        });
      }
    }
  });

  revalidatePath("/vendor/pedidos");
  revalidatePath(`/vendor/pedidos/${orderId}`);
  revalidatePath(`/pedido/${orderId}`);
  revalidatePath(`/mis-pedidos/${orderId}`);

  await notifyOrderCancelled(order.id, { exceptUserId: auth.userId, reason: reasonText });

  return NextResponse.json({ ok: true });
}
