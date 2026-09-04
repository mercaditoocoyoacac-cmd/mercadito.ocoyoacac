import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { productUpdateSchema as UpdateProductSchema } from "@/lib/schemas";
import { broadcastPromotion } from "@/server/push";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ ok: false }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = UpdateProductSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  const product = await prisma.product.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, isPromotion: true, name: true },
  });
  if (!product) return NextResponse.json({ ok: false }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: parsed.data.name?.trim(),
      description:
        parsed.data.description === undefined
          ? undefined
          : parsed.data.description?.trim() || null,
      priceCents: parsed.data.priceCents,
      imageUrl: parsed.data.imageUrl,
      isActive: parsed.data.isActive,
      sku: parsed.data.sku,
      stock: parsed.data.stock,
      sellByWeight: parsed.data.sellByWeight,
      minWeightGrams: parsed.data.minWeightGrams,
      maxWeightGrams: parsed.data.maxWeightGrams,
      isService: parsed.data.isService,
      showPrice: parsed.data.showPrice,
      isPromotion: parsed.data.isPromotion,
      promotionPriceCents: parsed.data.promotionPriceCents,
      discountPercentage: parsed.data.discountPercentage,
      promotionStartDate: parsed.data.promotionStartDate,
      promotionEndDate: parsed.data.promotionEndDate,
    },
    select: { name: true, isPromotion: true },
  });

  const justActivated = updated.isPromotion && !product.isPromotion;
  if (justActivated) {
    const storeInfo = await prisma.store.findUnique({
      where: { id: store.id },
      select: { name: true },
    });
    broadcastPromotion({
      storeName: storeInfo?.name || "Mercadito Ocoyoacac",
      productName: updated.name,
      discountPercentage: parsed.data.discountPercentage ?? null,
    });
  }

  if (parsed.data.variants !== undefined) {
    const existing = await prisma.productVariant.findMany({
      where: { productId: id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((v) => v.id));
    const incomingIds = new Set(
      parsed.data.variants.filter((v) => v.id).map((v) => v.id!),
    );

    const toDelete = existing.filter((v) => !incomingIds.has(v.id));
    if (toDelete.length > 0) {
      await prisma.productVariant.deleteMany({
        where: { id: { in: toDelete.map((v) => v.id) } },
      });
    }

    for (const variant of parsed.data.variants) {
      if (variant.id && existingIds.has(variant.id)) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { name: variant.name, priceCents: variant.priceCents, sortOrder: variant.sortOrder },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: id,
            name: variant.name,
            priceCents: variant.priceCents,
            sortOrder: variant.sortOrder,
          },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ ok: false }, { status: 403 });

  const product = await prisma.product.findFirst({
    where: { id, storeId: store.id },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ ok: false }, { status: 403 });

  const product = await prisma.product.findFirst({
    where: { id, storeId: store.id },
    select: { id: true, isUnavailable: true },
  });
  if (!product) return NextResponse.json({ ok: false }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: { isUnavailable: !product.isUnavailable },
  });

  return NextResponse.json({ ok: true, isUnavailable: updated.isUnavailable });
}
