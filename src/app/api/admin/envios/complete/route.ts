import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { orderId } = await req.json().catch(() => ({ orderId: "" }));

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requerido" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.status === "COMPLETED") {
    return NextResponse.json({ ok: false, error: "El pedido ya está completado" }, { status: 400 });
  }

  if (order.status === "CANCELLED") {
    return NextResponse.json({ ok: false, error: "No se puede completar un pedido cancelado" }, { status: 400 });
  }

  const statusTimestamps = await prisma.order.findUnique({
    where: { id: orderId },
    select: { statusTimestamps: true },
  });

  const timestamps = (statusTimestamps?.statusTimestamps as Record<string, string>) || {};

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "COMPLETED",
      statusTimestamps: { ...timestamps, COMPLETED: new Date().toISOString() },
    },
  });

  revalidatePath("/admin/envios");
  revalidatePath(`/admin/pedidos/${orderId}`);

  return NextResponse.json({ ok: true });
}
