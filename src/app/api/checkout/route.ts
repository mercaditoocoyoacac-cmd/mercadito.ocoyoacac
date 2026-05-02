import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { rateLimit, getClientIP } from "@/server/rateLimit";
import { isStoreOpen } from "@/lib/schedule";

function generateDeliveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const CheckoutSchema = z.object({
  fulfillmentType: z.enum(["PICKUP", "DELIVERY"]),
  paymentMethod: z.enum(["CASH", "ONLINE"]).default("CASH"),
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(6).max(30),
  customerAddress: z.string().max(140).optional(),
  customerLat: z.number().optional(),
  customerLng: z.number().optional(),
  notes: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const { success, remaining } = rateLimit(`checkout:${ip}`);
  
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429 }
    );
  }

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

  if (parsed.data.fulfillmentType === "DELIVERY" && (!parsed.data.customerLat || !parsed.data.customerLng)) {
    return NextResponse.json(
      { ok: false, error: "Marca tu ubicación en el mapa." },
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
          store: { select: { isActive: true, openTime: true, closeTime: true, scheduleDays: true } },
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

  const badItem = items.find(
    (cartItem: typeof items[number]) =>
      !cartItem.product.isActive || !cartItem.product.store.isActive,
  );
  if (badItem) {
    return NextResponse.json(
      { ok: false, error: "Hay productos no disponibles en tu carrito." },
      { status: 400 },
    );
  }

  const store = items[0]!.product.store;
  if (!isStoreOpen(store)) {
    return NextResponse.json(
      { ok: false, error: "La tienda está cerrada en este momento." },
      { status: 400 },
    );
  }

  const storeId = items[0]!.product.storeId;
  if (items.some((cartItem: typeof items[number]) => cartItem.product.storeId !== storeId)) {
    return NextResponse.json(
      { ok: false, error: "El carrito solo puede contener productos de una tienda." },
      { status: 400 },
    );
  }

  const currency = items[0]!.product.currency;
  const subtotalCents = items.reduce(
    (sum: number, cartItem: typeof items[number]) =>
      sum + cartItem.quantity * cartItem.product.priceCents,
    0,
  );
  const deliveryCents = 0;
  const totalCents = subtotalCents + deliveryCents;
  const deliveryCode = generateDeliveryCode();

  const order = await prisma.order.create({
    data: {
      userId: auth.userId,
      storeId,
      fulfillmentType: parsed.data.fulfillmentType,
      paymentMethod: parsed.data.paymentMethod,
      customerName: parsed.data.customerName.trim(),
      customerPhone: parsed.data.customerPhone.trim(),
      customerAddress: parsed.data.customerAddress?.trim() || null,
      customerLat: parsed.data.customerLat || null,
      customerLng: parsed.data.customerLng || null,
      notes: parsed.data.notes?.trim() || null,
      subtotalCents,
      deliveryCents,
      totalCents,
      currency,
      deliveryCode,
      items: {
        create: items.map((cartItem: typeof items[number]) => ({
          productId: cartItem.product.id,
          name: cartItem.product.name,
          priceCents: cartItem.product.priceCents,
          quantity: cartItem.quantity,
        })),
      },
    },
    select: { id: true },
  });

  await prisma.cartItem.deleteMany({ where: { userId: auth.userId } });

  let paymentUrl: string | undefined;
  let mpError: string | undefined;

  if (parsed.data.paymentMethod === "ONLINE") {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { mercadoPagoAccessToken: true, name: true, acceptsMercadoPago: true },
    });

    if (store?.mercadoPagoAccessToken) {
      const encrypted = store.mercadoPagoAccessToken;
      const base64 = Buffer.from(encrypted, "hex").toString("utf8");
      const accessToken = Buffer.from(base64, "base64").toString("utf8");

      try {
        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            items: items.map((item: typeof items[number]) => ({
              title: item.product.name,
              quantity: item.quantity,
              unit_price: item.product.priceCents / 100,
              currency_id: "MXN",
            })),
            back_urls: {
              success: `${process.env.NEXTAUTH_URL}/pedido/${order.id}`,
              failure: `${process.env.NEXTAUTH_URL}/carrito`,
              pending: `${process.env.NEXTAUTH_URL}/pedido/${order.id}`,
            },
            external_reference: order.id,
          }),
        });

        const responseText = await mpResponse.text();
        
        if (!responseText) {
          console.error("MP response empty, status:", mpResponse.status);
          mpError = "Error de autorización. Contacta al vendedor para configurar pagos.";
        } else {
          const mpData = JSON.parse(responseText);
          
          if (mpData.init_point) {
            paymentUrl = mpData.init_point;
          } else if (mpData.error) {
            const errorMsg = mpData.error?.message || mpData.message || "Error desconocido";
            console.error("MercadoPago error:", errorMsg);
          }
        }
      } catch (e) {
        console.error("MP fetch/parse error:", e);
      }
    }
  }

  const response: { ok: boolean; orderId: string; paymentUrl?: string; error?: string } = {
    ok: true,
    orderId: order.id,
  };

  if (parsed.data.paymentMethod === "ONLINE") {
    if (paymentUrl) {
      response.paymentUrl = paymentUrl;
    } else if (mpError) {
      response.error = mpError;
    } else {
      response.error = "El pago con tarjeta no está disponible. Usa pago contraentrega.";
    }
  }

  return NextResponse.json(response);
}
