import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { isStoreOpen } from "@/lib/schedule";

const AddSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
});

const UpdateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(99),
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
      product: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          currency: true,
          isUnavailable: true,
          store: { select: { id: true, name: true, slug: true, acceptsMercadoPago: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, items });
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

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId: auth.userId, productId: product.id } },
    create: {
      userId: auth.userId,
      productId: product.id,
      quantity: parsed.data.quantity,
    },
    update: {
      quantity: { increment: parsed.data.quantity },
    },
  });

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

  if (parsed.data.quantity === 0) {
    await prisma.cartItem.deleteMany({
      where: { userId: auth.userId, productId: parsed.data.productId },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.cartItem.updateMany({
    where: { userId: auth.userId, productId: parsed.data.productId },
    data: { quantity: parsed.data.quantity },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = z
    .object({ productId: z.string().min(1) })
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  await prisma.cartItem.deleteMany({
    where: { userId: auth.userId, productId: parsed.data.productId },
  });

  return NextResponse.json({ ok: true });
}

