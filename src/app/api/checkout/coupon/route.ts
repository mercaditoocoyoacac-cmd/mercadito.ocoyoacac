import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { applyCouponSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = applyCouponSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Código inválido." }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase().trim();

  const items = await prisma.cartItem.findMany({
    where: { userId: auth.userId },
    select: {
      quantity: true,
      weightGrams: true,
      variantId: true,
      variant: { select: { priceCents: true } },
      product: {
        select: { id: true, priceCents: true, sellByWeight: true, storeId: true },
      },
    },
  });

  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Carrito vacío." }, { status: 400 });
  }

  const storeId = items[0]!.product.storeId;
  if (items.some((i) => i.product.storeId !== storeId)) {
    return NextResponse.json({ ok: false, error: "Carrito con múltiples tiendas." }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code_storeId: { code, storeId } },
  });

  if (!coupon) {
    return NextResponse.json({ ok: false, error: "Cupón no encontrado para esta tienda." }, { status: 404 });
  }

  if (!coupon.isActive) {
    return NextResponse.json({ ok: false, error: "Este cupón ya no está activo." }, { status: 400 });
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return NextResponse.json({ ok: false, error: "Este cupón aún no está vigente." }, { status: 400 });
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return NextResponse.json({ ok: false, error: "Este cupón ya expiró." }, { status: 400 });
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ ok: false, error: "Este cupón ya alcanzó su límite de usos." }, { status: 400 });
  }

  if (coupon.maxUsesPerUser) {
    const userUsage = await prisma.order.count({
      where: { userId: auth.userId, couponId: coupon.id },
    });
    if (userUsage >= coupon.maxUsesPerUser) {
      return NextResponse.json({ ok: false, error: "Ya usaste este cupón el máximo de veces permitido." }, { status: 400 });
    }
  }

  const subtotalCents = items.reduce((sum, item) => {
    const price = item.variant?.priceCents ?? item.product.priceCents;
    if (item.product.sellByWeight && item.weightGrams) {
      return sum + Math.round((item.weightGrams / 1000) * price) * item.quantity;
    }
    return sum + item.quantity * price;
  }, 0);

  if (coupon.minPurchaseCents && subtotalCents < coupon.minPurchaseCents) {
    const minFormatted = `$${(coupon.minPurchaseCents / 100).toFixed(2)}`;
    return NextResponse.json({
      ok: false,
      error: `Compra mínima de ${minFormatted} para usar este cupón.`,
    }, { status: 400 });
  }

  let discountCents = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discountCents = Math.round((subtotalCents * coupon.discountValue) / 100);
  } else {
    discountCents = coupon.discountValue;
  }
  if (discountCents > subtotalCents) {
    discountCents = subtotalCents;
  }

  return NextResponse.json({
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountCents,
    },
  });
}
