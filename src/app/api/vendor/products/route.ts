import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { productCreateSchemaBase as CreateProductSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") || "date";
  const dir = searchParams.get("dir") || "desc";

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ ok: true, products: [] });

  function getOrderBy(s: string, d: "asc" | "desc"): Record<string, "asc" | "desc"> {
    if (s === "name") return { name: d };
    if (s === "manual") return { sortOrder: d };
    return { createdAt: d };
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: getOrderBy(sort, dir === "asc" ? "asc" : "desc"),
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
      sellByWeight: parsed.data.sellByWeight ?? false,
      minWeightGrams: parsed.data.minWeightGrams,
      maxWeightGrams: parsed.data.maxWeightGrams,
      variants: parsed.data.variants?.length
        ? { create: parsed.data.variants }
        : undefined,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, product });
}
