import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requerido." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: auth.userId, status: "PENDING" },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      paymentMethod: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      customerLat: true,
      customerLng: true,
      notes: true,
      store: { select: { id: true, name: true, slug: true } },
      items: {
        select: {
          id: true,
          name: true,
          productId: true,
          variantId: true,
          weightGrams: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, error: "El pedido no existe o ya fue confirmado y ya no puede modificarse." },
      { status: 400 },
    );
  }

  const unavailable: string[] = [];
  const availableItems: { productId: string; variantId: string | null; weightGrams: number | null; quantity: number; name: string }[] = [];

  for (const item of order.items) {
    if (!item.productId) {
      unavailable.push(item.name);
      continue;
    }
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { isActive: true, isUnavailable: true, isService: true, storeId: true },
    });
    if (
      !product ||
      !product.isActive ||
      product.isUnavailable ||
      product.isService ||
      product.storeId !== order.store.id
    ) {
      unavailable.push(item.name);
      continue;
    }
    availableItems.push({
      productId: item.productId,
      variantId: item.variantId,
      weightGrams: item.weightGrams,
      quantity: item.quantity,
      name: item.name,
    });
  }

  if (availableItems.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Los productos de este pedido ya no están disponibles y no se puede modificar." },
      { status: 400 },
    );
  }

  await prisma.cartItem.deleteMany({ where: { userId: auth.userId } });
  for (const item of availableItems) {
    await prisma.cartItem.create({
      data: {
        userId: auth.userId,
        productId: item.productId,
        variantId: item.variantId,
        weightGrams: item.weightGrams,
        quantity: item.quantity,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    shortId: order.id.slice(-8).toUpperCase(),
    storeName: order.store.name,
    storeSlug: order.store.slug,
    unavailable,
    prefill: {
      fulfillmentType: order.fulfillmentType,
      paymentMethod: order.paymentMethod,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      customerLat: order.customerLat,
      customerLng: order.customerLng,
      notes: order.notes,
    },
  });
}