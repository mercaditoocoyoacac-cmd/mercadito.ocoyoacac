import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const orders = await prisma.order.findMany({
    where: {
      fulfillmentType: "DELIVERY",
      status: { not: "PENDING" },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      paymentMethod: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      customerLat: true,
      customerLng: true,
      notes: true,
      subtotalCents: true,
      deliveryCents: true,
      totalCents: true,
      currency: true,
      deliveryCode: true,
      pickupCode: true,
      arrivedAt: true,
      arrivalConfirmedAt: true,
      createdAt: true,
      updatedAt: true,
      statusTimestamps: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
      store: { select: { id: true, name: true, slug: true, latitude: true, longitude: true, address: true, phone: true } },
      deliveryUser: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          weightGrams: true,
          priceCents: true,
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  });

  const drivers = await prisma.user.findMany({
    where: { role: "DELIVERY", isActive: true },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    ok: true,
    orders: orders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      arrivedAt: o.arrivedAt?.toISOString() ?? null,
      arrivalConfirmedAt: o.arrivalConfirmedAt?.toISOString() ?? null,
    })),
    drivers,
  });
}
