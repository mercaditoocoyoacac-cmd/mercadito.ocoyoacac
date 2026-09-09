import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import {
  VENDE_PLUS_FULL_PRICE_CENTS,
  VENDE_PLUS_DISCOUNTED_PRICE_CENTS,
  GRACE_DATE,
  SOLO_DELIVERY_PRICE_CENTS,
  membershipPlanLabel,
} from "@/lib/membership";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => (null));
  const code = body?.code?.toUpperCase?.()?.trim();
  const plan = body?.plan === "SOLO_DELIVERY" ? "SOLO_DELIVERY" : "MEMBER";
  if (!code) {
    return NextResponse.json({ ok: false, error: "Código requerido." }, { status: 400 });
  }

  const coupon = await prisma.membershipCoupon.findUnique({ where: { code } });
  if (!coupon) {
    return NextResponse.json({ ok: false, error: "Cupón no encontrado." }, { status: 404 });
  }

  if (coupon.plan && coupon.plan !== plan) {
    return NextResponse.json(
      { ok: false, error: `Este cupón solo aplica para la membresía ${membershipPlanLabel(coupon.plan)}.` },
      { status: 400 },
    );
  }

  const now = new Date();
  if (!coupon.isActive) {
    return NextResponse.json({ ok: false, error: "Este cupón está inactivo." }, { status: 400 });
  }
  if (coupon.startsAt && now < coupon.startsAt) {
    return NextResponse.json({ ok: false, error: "Este cupón aún no está vigente." }, { status: 400 });
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return NextResponse.json({ ok: false, error: "Este cupón ya expiró." }, { status: 400 });
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ ok: false, error: "Este cupón ya alcanzó su límite de usos." }, { status: 400 });
  }

  // Determine base price
  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    include: { subscription: true },
  });

  const isDiscounted = store?.subscription?.discountEndDate
    ? now < store.subscription.discountEndDate
    : false;
  let basePrice = plan === "SOLO_DELIVERY"
    ? SOLO_DELIVERY_PRICE_CENTS
    : isDiscounted
      ? VENDE_PLUS_DISCOUNTED_PRICE_CENTS
      : VENDE_PLUS_FULL_PRICE_CENTS;

  // Grace period
  const hasGrace = store && store.createdAt < GRACE_DATE;
  if (hasGrace && now < GRACE_DATE) {
    basePrice = 0;
  }

  // Calculate final price
  let finalPrice: number;
  if (coupon.discountType === "PERCENTAGE") {
    finalPrice = Math.round(basePrice * (1 - coupon.discountValue / 100));
  } else {
    finalPrice = Math.max(1, basePrice - coupon.discountValue);
  }

  const savings = basePrice - finalPrice;

  return NextResponse.json({
    ok: true,
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      plan: coupon.plan,
    },
    basePrice,
    finalPrice,
    savings,
  });
}
