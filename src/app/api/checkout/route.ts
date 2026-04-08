import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const CheckoutSchema = z.object({
  fulfillmentType: z.enum(["PICKUP", "DELIVERY"]),
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(6).max(30),
  customerAddress: z.string().max(140).optional(),
  notes: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  if (parsed.data.fulfillmentType === "DELIVERY" && !parsed.data.customerAddress) {
    return NextResponse.json(
      { ok: false, error: "La dirección es requerida para entrega." },
      { status: 400 },
    );
  }

  const items = await prisma.cartItem.findMany({
    where: { userId: auth.userId },
    select: {
      quantity: true,
      product: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          currency: true,
          storeId: true,
          isActive: true,
          store: { select: { isActive: true } },
        },
      },
    },
  });

  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Tu carrito está vacío." },
      { status: 400 },
    );
  }

  const bad = items.find(
    (item: typeof items[number]) =>
      !item.product.isActive || !item.product.store.isActive,
  );
  if (bad) {
    return NextResponse.json(
      { ok: false, error: "Hay productos no disponibles en tu carrito." },
      { status: 400 },
    );
  }

  const storeId = items[0]!.product.storeId;
  if (items.some((item: typeof items[number]) => item.product.storeId !== storeId)) {
    return NextResponse.json(
      { ok: false, error: "El carrito solo puede contener productos de una tienda." },
      { status: 400 },
    );
  }

  const currency = items[0]!.product.currency;
  const subtotalCents = items.reduce(
    (sum: number, item: typeof items[number]) =>
      sum + item.quantity * item.product.priceCents,
    0,
  );

  const order = await prisma.order.create({
    data: {
      userId: auth.userId,
      storeId,
      fulfillmentType: parsed.data.fulfillmentType,
      customerName: parsed.data.customerName.trim(),
      customerPhone: parsed.data.customerPhone.trim(),
      customerAddress: parsed.data.customerAddress?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      subtotalCents,
      currency,
      items: {
        create: items.map((item: typeof items[number]) => ({
          productId: item.product.id,
          name: item.product.name,
          priceCents: item.product.priceCents,
          quantity: item.quantity,
        })),
      },
    },
    select: { id: true },
  });

  await prisma.cartItem.deleteMany({ where: { userId: auth.userId } });

  return NextResponse.json({ ok: true, orderId: order.id });
}

