import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { appendStatusTimestamp } from "@/lib/statusTimestamps";

const CANCEL_WINDOW_MIN = 5;

const CANCELLATION_REASONS = [
  "Cambié de opinión",
  "Encontré mejor opción en otro lugar",
  "El pedido fue un error",
  "El tiempo de espera es muy largo",
  "Problema con el pago",
  "Otro",
];

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
      createdAt: true,
      statusTimestamps: true,
      items: { select: { productId: true, quantity: true, weightGrams: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.status === "CANCELLED" || order.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Este pedido ya fue cancelado o completado." },
      { status: 400 },
    );
  }

  if (order.status === "READY" || order.status === "OUT_FOR_DELIVERY") {
    return NextResponse.json(
      {
        error:
          "Tu pedido ya está en preparación o en camino y llegará a su destino. Ya no puedes cancelarlo. Si tienes algún problema, contacta directamente a la tienda.",
      },
      { status: 400 },
    );
  }

  if (order.status === "CONFIRMED") {
    const timestamps = order.statusTimestamps as Record<string, string> | null;
    const confirmedAt = timestamps?.CONFIRMED
      ? new Date(timestamps.CONFIRMED).getTime()
      : new Date(order.createdAt).getTime();
    const minutesSinceConfirmed = (Date.now() - confirmedAt) / 60000;
    if (minutesSinceConfirmed > CANCEL_WINDOW_MIN) {
      return NextResponse.json(
        {
          error:
            "Solo puedes cancelar hasta 5 minutos después de la confirmación. Tu pedido ya llegará a su destino.",
        },
        { status: 400 },
      );
    }
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

  return NextResponse.json({ ok: true });
}