import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const VariantSchema = z.object({
  name: z.string().min(1).max(80),
  priceCents: z.number().int().min(1),
  sortOrder: z.number().int().default(0),
});

const CreateProductSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().min(1),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  sku: z.string().optional(),
  stock: z.number().int().min(-1).optional(),
  variants: z.array(VariantSchema).optional(),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ ok: true, products: [] });

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      currency: true,
      isActive: true,
      imageUrl: true,
      sku: true,
      stock: true,
      variants: {
        select: { id: true, name: true, priceCents: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return NextResponse.json({ ok: true, products });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) {
    return NextResponse.json(
      { ok: false, error: "Primero crea tu tienda." },
      { status: 400 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateProductSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      priceCents: parsed.data.priceCents,
      imageUrl: parsed.data.imageUrl ?? null,
      isActive: parsed.data.isActive ?? true,
      sku: parsed.data.sku?.trim() || null,
      stock: parsed.data.stock ?? -1,
      variants: parsed.data.variants?.length
        ? { create: parsed.data.variants }
        : undefined,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, product });
}
