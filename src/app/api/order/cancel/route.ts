import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { orderId } = await req.json().catch(() => ({}));
  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: auth.userId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      items: { select: { productId: true, quantity: true, weightGrams: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "Solo puedes cancelar pedidos pendientes" },
      { status: 400 },
    );
  }

  const minutesSinceCreation =
    (Date.now() - new Date(order.createdAt).getTime()) / 60000;

  if (minutesSinceCreation >= 10 && minutesSinceCreation <= 30) {
    return NextResponse.json(
      {
        error:
          "El pedido está en revisión. Podrás cancelarlo si el vendedor no responde en 30 minutos.",
      },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
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

  return NextResponse.json({ ok: true });
}
