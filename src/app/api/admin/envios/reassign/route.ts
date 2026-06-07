import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const ReassignSchema = z.object({
  orderId: z.string().min(1),
  driverId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const admin = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = ReassignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const { orderId, driverId } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, deliveryUserId: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.status === "COMPLETED" || order.status === "CANCELLED") {
    return NextResponse.json({ ok: false, error: "No se puede reasignar un pedido finalizado" }, { status: 400 });
  }

  const driver = await prisma.user.findUnique({
    where: { id: driverId },
    select: { role: true, isActive: true },
  });

  if (!driver || driver.role !== "DELIVERY" || !driver.isActive) {
    return NextResponse.json({ ok: false, error: "Repartidor no válido" }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryUserId: driverId },
  });

  revalidatePath("/admin/envios");
  revalidatePath(`/vendor/pedidos/${orderId}`);
  revalidatePath("/vendor/pedidos");
  revalidatePath("/delivery");

  return NextResponse.json({ ok: true });
}
