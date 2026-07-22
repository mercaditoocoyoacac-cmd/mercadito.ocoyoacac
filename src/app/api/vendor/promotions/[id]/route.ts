import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const UpdatePromotionSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  discountPercentage: z.number().int().min(1).max(100).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string()).min(1).optional(),
  promoPrices: z.record(z.string(), z.number().int().min(0).optional()).optional(),
  quantities: z.record(z.string(), z.number().int().min(1).optional()).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) {
    return NextResponse.json({ ok: false, error: "No tienes tienda" }, { status: 400 });
  }

  const existing = await prisma.promotion.findFirst({
    where: { id, storeId: store.id },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Promoción no encontrada" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = UpdatePromotionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((e) => e.message).join(", ") },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.discountPercentage !== undefined) updateData.discountPercentage = data.discountPercentage;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  if (data.productIds) {
    await prisma.promotionProduct.deleteMany({ where: { promotionId: id } });
    updateData.products = {
      create: data.productIds.map((pid) => ({
        productId: pid,
        promoPriceCents: data.promoPrices?.[pid] || null,
        quantity: data.quantities?.[pid] || 1,
      })),
    };
  }

  const promotion = await prisma.promotion.update({
    where: { id },
    data: updateData,
    include: {
      products: { include: { product: { select: { id: true, name: true, priceCents: true, imageUrl: true } } } },
    },
  });

  return NextResponse.json({ ok: true, promotion });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { id } = await params;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) {
    return NextResponse.json({ ok: false, error: "No tienes tienda" }, { status: 400 });
  }

  const existing = await prisma.promotion.findFirst({
    where: { id, storeId: store.id },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Promoción no encontrada" }, { status: 404 });
  }

  await prisma.promotion.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
