import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) {
    return NextResponse.json({ ok: false, error: "No tienes tienda." }, { status: 400 });
  }

  const coupons = await prisma.coupon.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, coupons });
}
