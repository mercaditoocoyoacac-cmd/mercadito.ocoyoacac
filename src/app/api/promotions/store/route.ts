import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ ok: false, error: "storeId required" }, { status: 400 });
  }

  const now = new Date();

  const promotions = await prisma.promotion.findMany({
    where: {
      storeId,
      isActive: true,
      OR: [
        { startDate: null },
        { startDate: { lte: now } },
      ],
      AND: [
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    include: {
      products: {
        include: {
          product: { select: { id: true, isPromotion: true, promotionPriceCents: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, promotions });
}
