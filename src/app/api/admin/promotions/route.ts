import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireRole } from "@/server/requireUser";

const CreatePromotionSchema = z.object({
  storeId: z.string().min(1, "Selecciona una tienda"),
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  discountPercentage: z.number().int().min(1).max(100).optional(),
  imageUrl: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  productIds: z.array(z.string()).min(1, "Selecciona al menos un producto"),
  promoPrices: z.record(z.string(), z.number().int().min(0).optional()),
});

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      store: { select: { id: true, name: true, slug: true } },
      products: {
        include: {
          product: { select: { id: true, name: true, priceCents: true, imageUrl: true } },
        },
      },
    },
  });

  const stores = await prisma.store.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, promotions, stores });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = CreatePromotionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((e) => e.message).join(", ") },
      { status: 400 },
    );
  }

  const store = await prisma.store.findUnique({ where: { id: parsed.data.storeId }, select: { id: true } });
  if (!store) {
    return NextResponse.json({ ok: false, error: "Tienda no encontrada." }, { status: 404 });
  }

  const { storeId, title, description, discountPercentage, imageUrl, startDate, endDate, productIds, promoPrices } = parsed.data;

  const promotion = await prisma.promotion.create({
    data: {
      title,
      description: description || null,
      discountPercentage: discountPercentage || null,
      imageUrl: imageUrl || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
      storeId,
      products: {
        create: productIds.map((pid) => ({
          productId: pid,
          promoPriceCents: promoPrices[pid] || null,
        })),
      },
    },
    include: {
      products: { include: { product: { select: { name: true } } } },
    },
  });

  return NextResponse.json({ ok: true, promotion });
}
