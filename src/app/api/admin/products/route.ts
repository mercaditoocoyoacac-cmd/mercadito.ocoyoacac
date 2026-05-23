import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";
import { productCreateSchema as CreateProductSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ ok: false, products: [] });
  }

  const sort = searchParams.get("sort") || "date";
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  function getOrderBy(s: string, d: "asc" | "desc") {
    if (s === "manual") return { sortOrder: d } as const;
    if (s === "name") return { name: d } as const;
    return { createdAt: d } as const;
  }

  const products = await prisma.product.findMany({
    where: { storeId },
    orderBy: getOrderBy(sort, dir),
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
      isUnavailable: true,
      sellByWeight: true,
      sortOrder: true,
      variants: {
        select: { id: true, name: true, priceCents: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return NextResponse.json({ ok: true, products });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = CreateProductSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  const store = await prisma.store.findUnique({
    where: { id: parsed.data.storeId },
    select: { id: true },
  });
  if (!store) {
    return NextResponse.json(
      { ok: false, error: "Tienda no encontrada." },
      { status: 404 },
    );
  }

  const product = await prisma.product.create({
    data: {
      storeId: parsed.data.storeId,
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
