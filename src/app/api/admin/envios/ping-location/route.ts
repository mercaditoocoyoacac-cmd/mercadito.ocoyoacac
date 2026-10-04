import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { sendLocationPing } from "@/server/push";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES: OrderStatus[] = ["CONFIRMED", "READY", "OUT_FOR_DELIVERY"];
const PING_COOLDOWN_MS = 30_000;

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => ({}));
  const orderId: string | undefined =
    typeof json?.orderId === "string" && json.orderId ? json.orderId : undefined;

  const orders = await prisma.order.findMany({
    where: {
      fulfillmentType: "DELIVERY",
      status: { in: ACTIVE_STATUSES },
      deliveryUserId: { not: null },
      ...(orderId ? { id: orderId } : {}),
    },
    select: {
      id: true,
      deliveryUserId: true,
      driverPingedAt: true,
      deliveryUser: { select: { id: true, pushToken: true } },
    },
  });

  if (orders.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No hay envíos activos con repartidor asignado." },
      { status: 404 },
    );
  }

  const now = new Date();
  let pinged = 0;
  let skipped = 0;
  let noToken = 0;

  for (const order of orders) {
    if (!order.deliveryUser) continue;

    const token = order.deliveryUser.pushToken;
    if (!token) {
      noToken++;
      continue;
    }

    if (order.driverPingedAt && now.getTime() - order.driverPingedAt.getTime() < PING_COOLDOWN_MS) {
      skipped++;
      continue;
    }

    const sent = await sendLocationPing(token, order.id);
    if (sent) {
      pinged++;
      await prisma.order.update({
        where: { id: order.id },
        data: { driverPingedAt: now },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    pinged,
    skipped,
    noToken,
  });
}
