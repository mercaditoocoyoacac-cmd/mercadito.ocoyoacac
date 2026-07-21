import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { sendTextNotification } from "@/server/notifications";
import { sendPushToMultiple } from "@/server/push";
import { appendStatusTimestamp } from "@/lib/statusTimestamps";

const STATUS_FLOW = ["PENDING", "CONFIRMED", "READY", "OUT_FOR_DELIVERY", "COMPLETED"] as const;

const ActionSchema = z.object({
  action: z.enum(["advance", "cancel"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Acción inválida" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      statusTimestamps: true,
      fulfillmentType: true,
      deliveryUserId: true,
      storeId: true,
      items: { select: { productId: true, quantity: true, weightGrams: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.status === "CANCELLED") {
    return NextResponse.json({ ok: false, error: "El pedido ya está cancelado" }, { status: 400 });
  }

  if (parsed.data.action === "cancel") {
    if (order.status === "COMPLETED") {
      return NextResponse.json({ ok: false, error: "No se puede cancelar un pedido entregado" }, { status: 400 });
    }

    const currentTs = order.statusTimestamps as Record<string, string> | null;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
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

    return NextResponse.json({ ok: true, newStatus: "CANCELLED" });
  }

  // action === "advance"
  const currentIdx = STATUS_FLOW.indexOf(order.status as typeof STATUS_FLOW[number]);
  if (currentIdx === -1 || currentIdx >= STATUS_FLOW.length - 1) {
    return NextResponse.json({ ok: false, error: "El pedido ya está en su estado final" }, { status: 400 });
  }

  const newStatus = STATUS_FLOW[currentIdx + 1];

  const currentTs = order.statusTimestamps as Record<string, string> | null;

  await prisma.order.update({
    where: { id },
    data: {
      status: newStatus,
      statusTimestamps: appendStatusTimestamp(currentTs, newStatus),
    },
  });

  // Notify drivers when order becomes CONFIRMED/READY (DELIVERY, no driver assigned)
  if (
    (newStatus === "CONFIRMED" || newStatus === "READY") &&
    order.fulfillmentType === "DELIVERY" &&
    !order.deliveryUserId
  ) {
    const store = await prisma.store.findUnique({
      where: { id: order.storeId },
      select: { name: true },
    });

    const orderCustomer = await prisma.order.findUnique({
      where: { id },
      select: { customerName: true, customerAddress: true },
    });

    const drivers = await prisma.user.findMany({
      where: { role: "DELIVERY", isActive: true },
      select: { id: true, pushToken: true },
    });

    const notifyPromises = drivers.map((driver) =>
      sendTextNotification(driver.id, {
        title: "Nuevo pedido disponible",
        body: `${store?.name || "Tienda"} — ${orderCustomer?.customerName || "Cliente"}${orderCustomer?.customerAddress ? ` | ${orderCustomer.customerAddress}` : ""}`,
        type: "NEW_ORDER",
        url: "/delivery",
      }),
    );

    const driverTokens = drivers
      .map((d) => d.pushToken)
      .filter((t): t is string => Boolean(t));

    if (driverTokens.length > 0) {
      notifyPromises.push(
        sendPushToMultiple(driverTokens, {
          title: "Nuevo pedido disponible",
          body: `${store?.name || "Tienda"} — ${orderCustomer?.customerName || "Cliente"}`,
          type: "NEW_ORDER",
          url: "/delivery",
        }),
      );
    }

    if (notifyPromises.length > 0) {
      await Promise.allSettled(notifyPromises);
    }
  }

  return NextResponse.json({ ok: true, newStatus });
}
