import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { notifyOrderCancelled } from "@/server/orderNotifications";
import { appendStatusTimestamp } from "@/lib/statusTimestamps";
import { getStaffCancellationBlockMessage, requiresCancellationReason } from "@/lib/orderCancellation";

const CancelSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(3, "Indica el motivo de la cancelación.").max(300).optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN", "DISPATCH");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = CancelSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { orderId } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, statusTimestamps: true, items: { select: { productId: true, quantity: true, weightGrams: true } } },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  const blockMessage = getStaffCancellationBlockMessage(order.status);
  if (blockMessage) {
    return NextResponse.json({ ok: false, error: blockMessage }, { status: 400 });
  }
  if (requiresCancellationReason(order.status) && !parsed.data.reason) {
    return NextResponse.json(
      { ok: false, error: "Indica el motivo de la cancelación." },
      { status: 400 },
    );
  }

  const currentTs = order.statusTimestamps as Record<string, string> | null;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelReason: parsed.data.reason ?? "Cancelado por administración o monitoreo",
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

  revalidatePath("/admin/envios");
  revalidatePath("/vendor/pedidos");

  await notifyOrderCancelled(orderId);

  return NextResponse.json({ ok: true });
}
