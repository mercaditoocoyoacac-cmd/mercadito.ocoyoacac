import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

const CheckoutSchema = z.object({
  fulfillmentType: z.enum(["PICKUP", "DELIVERY"]),
  paymentMethod: z.enum(["CASH", "ONLINE"]).default("CASH"),
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

  const order = await prisma.order.create({
    data: {
      userId: auth.userId,
      storeId,
      fulfillmentType: parsed.data.fulfillmentType,
      paymentMethod: parsed.data.paymentMethod,
      customerName: parsed.data.customerName.trim(),
      customerPhone: parsed.data.customerPhone.trim(),
      customerAddress: parsed.data.customerAddress?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      subtotalCents,
      deliveryCents,
      totalCents,
      currency,
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
  let storeName = "Unknown";
  let hasToken = false;
  let acceptsMP = false;

  if (parsed.data.paymentMethod === "ONLINE") {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { mercadoPagoAccessToken: true, name: true, acceptsMercadoPago: true },
    });

    storeName = store?.name || "Unknown";
    hasToken = !!store?.mercadoPagoAccessToken;
    acceptsMP = store?.acceptsMercadoPago || false;
    console.log("MP payment check - Store:", storeName, "hasToken:", hasToken, "acceptsMP:", acceptsMP);

    if (store?.mercadoPagoAccessToken) {
      const accessToken = Buffer.from(store.mercadoPagoAccessToken, "hex").toString("utf8");
      console.log("Store:", storeName, "Token exists, calling MP API");

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

        const mpData = await mpResponse.json();
        const mpLogs = {
          status: mpResponse.status,
          hasInitPoint: !!mpData.init_point,
          error: mpData.error,
          response: mpResponse.status >= 400 ? mpData.message || mpData.error : "OK"
        };
        console.log("MP response:", JSON.stringify(mpLogs));
        
        if (mpData.init_point) {
          paymentUrl = mpData.init_point;
          console.log("Got payment URL:", (paymentUrl || "").substring(0, 50) + "...");
        } else if (mpData.error) {
          console.error("MP API error:", JSON.stringify(mpData.error));
        } else {
          console.error("MP no init_point, response:", mpData);
        }
      } catch (e) {
        console.error("MP fetch error:", e);
      }
    } else {
      console.log("No mercadoPagoAccessToken for store:", storeName);
    }
  }

  const response: { ok: boolean; orderId: string; paymentUrl?: string; error?: string; debug?: string } = {
    ok: true,
    orderId: order.id,
    debug: parsed.data.paymentMethod === "ONLINE" 
      ? (paymentUrl ? "MP OK: " + paymentUrl.substring(0, 30) : "MP failed - token:" + hasToken + ", accepted:" + acceptsMP)
      : "Payment method: " + parsed.data.paymentMethod,
  };

  if (parsed.data.paymentMethod === "ONLINE") {
    if (paymentUrl) {
      response.paymentUrl = paymentUrl;
    } else {
      response.error = "El pago con tarjeta no está disponible. Usa pago contraentrega.";
    }
  }

  return NextResponse.json(response);
}
