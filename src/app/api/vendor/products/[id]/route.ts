import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const VariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  priceCents: z.number().int().min(1),
  sortOrder: z.number().int().default(0),
});

const UpdateProductSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().min(1).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  sku: z.string().nullable().optional(),
  stock: z.number().int().min(-1).optional(),
  variants: z.array(VariantSchema).optional(),
});

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
    select: { id: true },
  });
  if (!product) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.product.update({
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
    },
  });

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
