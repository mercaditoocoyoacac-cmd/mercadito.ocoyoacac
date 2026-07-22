import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/server/prisma";
import { isStoreOpen } from "@/lib/schedule";
import { StorefrontClient } from "@/components/storefront/StorefrontClient";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      description: true,
      phone: true,
      address: true,
      imageUrl: true,
      isActive: true,
      openTime: true,
      closeTime: true,
      scheduleDays: true,
      scheduleDetails: true,
      plan: true,
    },
  });
  if (!store || !store.isActive) return notFound();

  const open = store.category === "SERVICIOS" ? true : isStoreOpen(store as any);

  const products = await prisma.product.findMany({
    where: { storeId: store.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      currency: true,
      imageUrl: true,
      isUnavailable: true,
      sellByWeight: true,
      minWeightGrams: true,
      maxWeightGrams: true,
      soldCount: true,
      isPromotion: true,
      promotionPriceCents: true,
      discountPercentage: true,
      variants: {
        where: { isActive: true },
        select: { id: true, name: true, priceCents: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const storePromotions = store.plan === "MEMBER" ? await prisma.promotion.findMany({
    where: {
      storeId: store.id,
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      discountPercentage: true,
      requiresCoupon: true,
      products: {
        select: {
          promoPriceCents: true,
          quantity: true,
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              priceCents: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  }) : [];

  return (
    <StorefrontClient
      store={JSON.parse(JSON.stringify(store))}
      products={JSON.parse(JSON.stringify(products))}
      storePromotions={JSON.parse(JSON.stringify(storePromotions))}
      open={open}
    />
  );
}
