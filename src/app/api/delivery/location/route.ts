import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  orderId: z.string().optional(),
});

const ACTIVE_DELIVERY_STATUSES = ["CONFIRMED", "READY", "OUT_FOR_DELIVERY"] as const;

export async function POST(req: Request) {
  const auth = await requireRole("DELIVERY");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = LocationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  const { latitude, longitude, orderId } = parsed.data;
  const now = new Date();

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      latitude,
      longitude,
    },
  });

  const snapshot = { driverLat: latitude, driverLng: longitude, driverLocationAt: now };

  if (orderId) {
    const updated = await prisma.order.updateMany({
      where: {
        id: orderId,
        deliveryUserId: auth.userId,
        status: { in: [...ACTIVE_DELIVERY_STATUSES] },
      },
      data: snapshot,
    });
    if (updated.count === 0) {
      await prisma.order.updateMany({
        where: {
          deliveryUserId: auth.userId,
          status: { in: [...ACTIVE_DELIVERY_STATUSES] },
        },
        data: snapshot,
      });
    }
  } else {
    await prisma.order.updateMany({
      where: {
        deliveryUserId: auth.userId,
        status: { in: [...ACTIVE_DELIVERY_STATUSES] },
      },
      data: snapshot,
    });
  }

  return NextResponse.json({ ok: true, at: now.toISOString() });
}
