import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";
import { productUpdateSchema as UpdateProductSchema } from "@/lib/schemas";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = UpdateProductSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id },
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
      sellByWeight: parsed.data.sellByWeight,
      minWeightGrams: parsed.data.minWeightGrams,
      maxWeightGrams: parsed.data.maxWeightGrams,
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
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
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
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, isUnavailable: true },
  });
  if (!product) return NextResponse.json({ ok: false }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: { isUnavailable: !product.isUnavailable },
  });

  return NextResponse.json({ ok: true, isUnavailable: updated.isUnavailable });
}
