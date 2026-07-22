import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const FULL_PRICE_CENTS = 83000;
const DISCOUNTED_PRICE_CENTS = 49800;
const GRACE_DATE = new Date("2026-08-01T00:00:00.000Z");

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => (null));
  const code = body?.code?.toUpperCase?.()?.trim();
  if (!code) {
    return NextResponse.json({ ok: false, error: "Código requerido." }, { status: 400 });
  }

  const coupon = await prisma.membershipCoupon.findUnique({ where: { code } });
  if (!coupon) {
    return NextResponse.json({ ok: false, error: "Cupón no encontrado." }, { status: 404 });
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
  let basePrice = isDiscounted ? DISCOUNTED_PRICE_CENTS : FULL_PRICE_CENTS;

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
    },
    basePrice,
    finalPrice,
    savings,
  });
}
