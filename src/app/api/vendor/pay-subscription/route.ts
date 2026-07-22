import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const FULL_PRICE_CENTS = 83000;
const DISCOUNTED_PRICE_CENTS = 49800;
const GRACE_DATE = new Date("2026-08-01T00:00:00.000Z");

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const couponCode: string | undefined = body.couponCode;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    include: { subscription: true },
  });
  if (!store) {
    return NextResponse.json({ ok: false, error: "No tienes una tienda registrada." }, { status: 404 });
  }

  const sub = store.subscription;
  const now = new Date();

  // Grace period for stores created before Aug 2026
  const hasGrace = store.createdAt < GRACE_DATE;
  if (hasGrace && now < GRACE_DATE) {
    return NextResponse.json({ ok: false, error: "Tu membresía está en período de gracia hasta agosto de 2026. No necesitas pagar todavía." }, { status: 400 });
  }

  // Determine base price
  const isDiscounted = sub?.discountEndDate ? now < sub.discountEndDate : false;
  let amountCents = isDiscounted ? DISCOUNTED_PRICE_CENTS : FULL_PRICE_CENTS;
  let appliedCouponCode: string | null = null;

  // Apply membership coupon if provided
  if (couponCode) {
    const coupon = await prisma.membershipCoupon.findUnique({
      where: { code: couponCode.toUpperCase().trim() },
    });
    if (!coupon) {
      return NextResponse.json({ ok: false, error: "Cupón no encontrado." }, { status: 400 });
    }
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
    if (coupon.maxUsesPerStore) {
      const storeUsage = await prisma.paymentReceipt.count({
        where: { storeId: store.id, couponCode: coupon.code },
      });
      if (storeUsage >= coupon.maxUsesPerStore) {
        return NextResponse.json({ ok: false, error: "Tu tienda ya usó este cupón el máximo de veces permitido." }, { status: 400 });
      }
    }

    const couponUsers = await prisma.membershipCouponUser.findMany({ where: { couponId: coupon.id }, select: { userId: true } });
    if (couponUsers.length > 0 && !couponUsers.some((u) => u.userId === auth.userId)) {
      return NextResponse.json({ ok: false, error: "Este cupón no está disponible para tu cuenta." }, { status: 400 });
    }
    if (coupon.userRegisteredBefore || coupon.storeCreatedBefore) {
      const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { createdAt: true } });
      const storeRecord = await prisma.store.findUnique({ where: { id: store.id }, select: { createdAt: true } });
      if (coupon.userRegisteredBefore && user && user.createdAt >= coupon.userRegisteredBefore) {
        return NextResponse.json({ ok: false, error: "Este cupón es solo para usuarios registrados antes de " + coupon.userRegisteredBefore.toLocaleDateString("es-MX") + "." }, { status: 400 });
      }
      if (coupon.storeCreatedBefore && storeRecord && storeRecord.createdAt >= coupon.storeCreatedBefore) {
        return NextResponse.json({ ok: false, error: "Este cupón es solo para tiendas creadas antes de " + coupon.storeCreatedBefore.toLocaleDateString("es-MX") + "." }, { status: 400 });
      }
    }

    // Calculate discounted price
    if (coupon.discountType === "PERCENTAGE") {
      amountCents = Math.round(amountCents * (1 - coupon.discountValue / 100));
    } else {
      amountCents = Math.max(1, amountCents - coupon.discountValue);
    }
    appliedCouponCode = coupon.code;
  }

  // Create MercadoPago preference using platform token
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Pasarela de pago no configurada. Contacta al administrador." }, { status: 500 });
  }

  // Encode coupon code in external reference for webhook tracking
  const externalRef = appliedCouponCode
    ? `sub_${store.id}_c_${appliedCouponCode}`
    : `sub_${store.id}`;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: appliedCouponCode
              ? `Membresía Mercadito Ocoyoacac - 1 mes (${appliedCouponCode})`
              : "Membresía Mercadito Ocoyoacac - 1 mes",
            description: `Suscripción mensual para ${store.name}${appliedCouponCode ? ` — cupón ${appliedCouponCode}` : ""}`,
            quantity: 1,
            unit_price: amountCents / 100,
            currency_id: "MXN",
          },
        ],
        back_urls: {
          success: `${baseUrl}/vendor/membresia?success=1`,
          failure: `${baseUrl}/vendor/membresia?error=1`,
          pending: `${baseUrl}/vendor/membresia?pending=1`,
        },
        auto_return: "approved",
        external_reference: externalRef,
      }),
    });

    const text = await mpResponse.text();
    if (!text) {
      return NextResponse.json({ ok: false, error: "Error al conectar con MercadoPago." }, { status: 502 });
    }

    const data = JSON.parse(text);
    if (!data.init_point) {
      console.error("MP error:", data);
      return NextResponse.json({ ok: false, error: "Error al crear el pago. Intenta más tarde." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      initPoint: data.init_point,
      finalPrice: amountCents,
      couponApplied: appliedCouponCode,
    });
  } catch (e) {
    console.error("pay-subscription error:", e);
    return NextResponse.json({ ok: false, error: "Error de conexión con la pasarela de pago." }, { status: 502 });
  }
}
