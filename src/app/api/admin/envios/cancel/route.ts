import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { appendStatusTimestamp } from "@/lib/statusTimestamps";

const CancelSchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = CancelSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const { orderId } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, statusTimestamps: true, items: { select: { productId: true, quantity: true, weightGrams: true } } },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.status === "COMPLETED") {
    return NextResponse.json({ ok: false, error: "No se puede cancelar un pedido entregado" }, { status: 400 });
  }

  const currentTs = order.statusTimestamps as Record<string, string> | null;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
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

  return NextResponse.json({ ok: true });
}
