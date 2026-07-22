import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

export async function GET() {
  const now = new Date();

  // Individual product promotions (legacy)
  const productPromotions = await prisma.product.findMany({
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
        select: { id: true, name: true, slug: true, imageUrl: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // Multi-product promotions
  const multiPromotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      store: { isActive: true },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      store: { select: { id: true, name: true, slug: true, imageUrl: true } },
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              priceCents: true,
              imageUrl: true,
              promotionPriceCents: true,
              isPromotion: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    productPromotions,
    multiPromotions,
  });
}
