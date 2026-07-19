import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function GET() {
  const now = new Date();
  const promotions = await prisma.product.findMany({
    where: {
      isPromotion: true,
      isActive: true,
      store: { isActive: true },
      promotionPriceCents: { not: null },
      OR: [
        { promotionEndDate: null },
        { promotionEndDate: { gte: now } },
      ],
    },
    select: {
      id: true,
      name: true,
      priceCents: true,
      promotionPriceCents: true,
      discountPercentage: true,
      imageUrl: true,
      promotionStartDate: true,
      promotionEndDate: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ ok: true, promotions });
}
