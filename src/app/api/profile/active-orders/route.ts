import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["OUT_FOR_DELIVERY", "READY"] },
      pickupCode: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      pickupCode: true,
      arrivedAt: true,
      arrivalConfirmedAt: true,
      store: { select: { name: true } },
    },
  });

  return NextResponse.json({ ok: true, orders });
}
