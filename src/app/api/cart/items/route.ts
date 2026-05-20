import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { isStoreOpen } from "@/lib/schedule";

const AddSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
  variantId: z.string().optional(),
  weightGrams: z.number().int().min(1).optional(),
});

const UpdateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(99),
  variantId: z.string().optional(),
  weightGrams: z.number().int().min(1).optional(),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const items = await prisma.cartItem.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      quantity: true,
      weightGrams: true,
      variantId: true,
      variant: {
        select: { id: true, name: true, priceCents: true },
      },
      product: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          currency: true,
          sellByWeight: true,
          isUnavailable: true,
           store: {
            select: {
              id: true,
              name: true,
              slug: true,
              acceptsMercadoPago: true,
              latitude: true,
              longitude: true,
              paymentMethods: {
                where: { isActive: true, status: "APPROVED" },
                select: { processor: true, label: true },
              },
            },
          },
        },
      },
    },
  });

  const hasOnlinePayment = items.some((item) =>
    item.product.store.paymentMethods.length > 0,
  );

  const result = items.map((item) => ({
    ...item,
    product: {
      ...item.product,
      store: {
        ...item.product.store,
        paymentMethods: undefined,
        hasOnlinePayment,
      },
    },
  }));

  return NextResponse.json({ ok: true, items: result });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = AddSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: {
      id: true,
      isActive: true,
      isUnavailable: true,
      storeId: true,
      store: { select: { isActive: true, openTime: true, closeTime: true, scheduleDays: true, category: true } },
    },
  });
  if (!product || !product.isActive || !product.store.isActive || product.isUnavailable) {
    return NextResponse.json(
      { ok: false, error: "Producto no disponible." },
      { status: 404 },
    );
  }

  if (product.store.category === "SERVICIOS") {
    return NextResponse.json(
      { ok: false, error: "Los servicios no se pueden agregar al carrito. Contacta al negocio para agendar una cita." },
      { status: 400 },
    );
  }

  if (!isStoreOpen(product.store)) {
    return NextResponse.json(
      { ok: false, error: "La tienda está cerrada en este momento." },
      { status: 400 },
    );
  }

  const existing = await prisma.cartItem.findFirst({
    where: { userId: auth.userId },
    select: { product: { select: { storeId: true } } },
  });

  if (existing && existing.product.storeId !== product.storeId) {
    await prisma.cartItem.deleteMany({ where: { userId: auth.userId } });
  }

  const variantId = parsed.data.variantId || null;
  const weightGrams = parsed.data.weightGrams || null;

  const existingItem = await prisma.cartItem.findFirst({
    where: { userId: auth.userId, productId: product.id, variantId, weightGrams },
  });

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: { increment: parsed.data.quantity } },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        userId: auth.userId,
        productId: product.id,
        variantId,
        weightGrams,
        quantity: parsed.data.quantity,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  const variantId = parsed.data.variantId || null;
  const weightGrams = parsed.data.weightGrams || null;

  if (parsed.data.quantity === 0) {
    await prisma.cartItem.deleteMany({
      where: { userId: auth.userId, productId: parsed.data.productId, variantId, weightGrams },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.cartItem.updateMany({
    where: { userId: auth.userId, productId: parsed.data.productId, variantId, weightGrams },
    data: { quantity: parsed.data.quantity },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = z
    .object({ productId: z.string().min(1), variantId: z.string().optional(), weightGrams: z.number().int().min(1).optional() })
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  const variantId = parsed.data.variantId || null;
  const weightGrams = parsed.data.weightGrams || null;
  await prisma.cartItem.deleteMany({
    where: { userId: auth.userId, productId: parsed.data.productId, variantId, weightGrams },
  });

  return NextResponse.json({ ok: true });
}
