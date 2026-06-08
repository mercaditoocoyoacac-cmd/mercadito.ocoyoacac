import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const FULL_PRICE_CENTS = 83000;
const DISCOUNTED_PRICE_CENTS = 49800;
const GRACE_DATE = new Date("2026-08-01T00:00:00.000Z");

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

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

  // Determine price
  const isDiscounted = sub?.discountEndDate ? now < sub.discountEndDate : false;
  const amountCents = isDiscounted ? DISCOUNTED_PRICE_CENTS : FULL_PRICE_CENTS;

  // Create MercadoPago preference using platform token
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Pasarela de pago no configurada. Contacta al administrador." }, { status: 500 });
  }

  const externalRef = `sub_${store.id}`;
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
            title: "Membresía Mercadito Ocoyoacac - 1 mes",
            description: `Suscripción mensual para ${store.name}`,
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

    return NextResponse.json({ ok: true, initPoint: data.init_point });
  } catch (e) {
    console.error("pay-subscription error:", e);
    return NextResponse.json({ ok: false, error: "Error de conexión con la pasarela de pago." }, { status: 502 });
  }
}
