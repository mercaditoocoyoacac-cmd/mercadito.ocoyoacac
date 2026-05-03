import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { autoAssignDelivery } from "@/lib/autoAssign";

const StatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = StatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  if (!store) {
    return NextResponse.json({ ok: false, error: "No tienes tienda." }, { status: 403 });
  }

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, fulfillmentType: true, deliveryUserId: true },
  });
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  if (
    parsed.data.status === "READY" &&
    order.fulfillmentType === "DELIVERY" &&
    !order.deliveryUserId
  ) {
    const assignment = await autoAssignDelivery(id);
    if (assignment) {
      return NextResponse.json({
        ok: true,
        assigned: true,
        driverDistance: assignment.distanceKm,
      });
    }
  }

  return NextResponse.json({ ok: true, assigned: false });
}
