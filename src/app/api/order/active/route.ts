import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const order = await prisma.order.findFirst({
    where: {
      userId: auth.userId,
      status: { in: ["PENDING", "CONFIRMED", "READY", "OUT_FOR_DELIVERY"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      totalCents: true,
      currency: true,
      store: { select: { name: true, slug: true } },
    },
  });

  if (!order) return NextResponse.json({ ok: true, activeOrder: null });

  return NextResponse.json({
    ok: true,
    activeOrder: {
      id: order.id,
      status: order.status,
      storeName: order.store.name,
      storeSlug: order.store.slug,
      totalCents: order.totalCents,
      currency: order.currency,
    },
  });
}