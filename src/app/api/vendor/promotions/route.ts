import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { sendPushToAdmins } from "@/server/push";

const CreatePromotionSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  discountPercentage: z.number().int().min(1).max(100).optional(),
  imageUrl: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  productIds: z.array(z.string()).min(1, "Selecciona al menos un producto"),
  promoPrices: z.record(z.string(), z.number().int().min(0).optional()),
  quantities: z.record(z.string(), z.number().int().min(1).optional()),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ ok: true, promotions: [] });

  const promotions = await prisma.promotion.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    include: {
      products: {
        include: {
          product: { select: { id: true, name: true, priceCents: true, imageUrl: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, promotions });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true, name: true },
  });
  if (!store) {
    return NextResponse.json({ ok: false, error: "No tienes tienda" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CreatePromotionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((e) => e.message).join(", ") },
      { status: 400 },
    );
  }

  const { title, description, discountPercentage, imageUrl, startDate, endDate, productIds, promoPrices, quantities } = parsed.data;

  const promotion = await prisma.promotion.create({
    data: {
      title,
      description: description || null,
      discountPercentage: discountPercentage || null,
      imageUrl: imageUrl || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      storeId: store.id,
      products: {
        create: productIds.map((pid) => ({
          productId: pid,
          promoPriceCents: promoPrices[pid] || null,
          quantity: quantities?.[pid] || 1,
        })),
      },
    },
    include: { products: { include: { product: { select: { name: true } } } } },
  });

  // Send push to admins
  const productNames = promotion.products.map((pp) => pp.product.name).join(", ");
  await sendPushToAdmins({
    title: "🏷️ Nueva promoción",
    body: `${store.name}: "${title}" — ${productNames}`,
    url: "/promociones",
    type: "PROMOTION",
  });

  return NextResponse.json({ ok: true, promotion });
}
