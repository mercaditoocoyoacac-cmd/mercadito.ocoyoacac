import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { sendTextNotification } from "@/server/notifications";
import { notifyCustomerOrderCompleted } from "@/server/notifications";
import { sendPushToMultiple } from "@/server/push";
import { appendStatusTimestamp } from "@/lib/statusTimestamps";

const StatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = StatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true, name: true, address: true },
  });
  if (!store) {
    return NextResponse.json({ ok: false, error: "No tienes tienda." }, { status: 403 });
  }

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, fulfillmentType: true, deliveryUserId: true, customerAddress: true, customerName: true, statusTimestamps: true },
  });
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
  }

  const currentTimestamps = order.statusTimestamps as Record<string, string> | null;

  await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      statusTimestamps: appendStatusTimestamp(currentTimestamps, parsed.data.status),
    },
  });

  if (parsed.data.status === "COMPLETED") {
    await notifyCustomerOrderCompleted(id);
  }

  if (
    (parsed.data.status === "CONFIRMED" || parsed.data.status === "READY") &&
    order.fulfillmentType === "DELIVERY" &&
    !order.deliveryUserId
  ) {
    const drivers = await prisma.user.findMany({
      where: { role: "DELIVERY", isActive: true },
      select: { id: true, pushToken: true },
    });

    const notifyPromises = drivers.map((driver) =>
      sendTextNotification(driver.id, {
        title: "Nuevo pedido disponible",
        body: `${store.name} — ${order.customerName}${order.customerAddress ? ` | ${order.customerAddress}` : ""}`,
        type: "NEW_ORDER",
        url: "/delivery",
      })
    );

    const driverTokens = drivers
      .map((d) => d.pushToken)
      .filter((t): t is string => Boolean(t));

    if (driverTokens.length > 0) {
      notifyPromises.push(
        sendPushToMultiple(driverTokens, {
          title: "Nuevo pedido disponible",
          body: `${store.name} — ${order.customerName}`,
          type: "NEW_ORDER",
          url: "/delivery",
        }),
      );
    }

    if (notifyPromises.length > 0) {
      await Promise.allSettled(notifyPromises);
    }
  }

  return NextResponse.json({ ok: true });
}
