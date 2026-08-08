import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";
import { rateLimit, getClientIP } from "@/server/rateLimit";
import { isStoreOpen } from "@/lib/schedule";
import { sendTextNotification } from "@/server/notifications";
import { notifyVendorNewOrder } from "@/server/whatsapp";
import { sendPushNotification, sendPushToMultiple } from "@/server/push";
import { calcDeliveryFeeCents, haversineDistance, pointInPolygon, RISK_ZONE_EXTRA_CENTS, type DeliveryFeeConfig } from "@/lib/geo";
import { getRouteDistanceKm } from "@/server/directions";

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
  couponCode: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const { success } = rateLimit(`checkout:${ip}`);
  
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
      weightGrams: true,
      variantId: true,
      variant: {
        select: { id: true, name: true, priceCents: true },
      },
      product: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          currency: true,
          sellByWeight: true,
          minWeightGrams: true,
          maxWeightGrams: true,
          storeId: true,
          isActive: true,
          isUnavailable: true,
          isPromotion: true,
          promotionPriceCents: true,
          promotionEndDate: true,
          stock: true,
          store: { select: { isActive: true, openTime: true, closeTime: true, scheduleDays: true, category: true, latitude: true, longitude: true, plan: true } },
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
      !cartItem.product.isActive || !cartItem.product.store.isActive || cartItem.product.isUnavailable,
  );
  if (badItem) {
    return NextResponse.json(
      { ok: false, error: "Hay productos no disponibles en tu carrito." },
      { status: 400 },
    );
  }

  if (items.some((cartItem: typeof items[number]) => cartItem.product.store.category === "SERVICIOS")) {
    return NextResponse.json(
      { ok: false, error: "Los servicios no se pueden pedir por carrito. Contacta al negocio para agendar." },
      { status: 400 },
    );
  }

  const store = items[0]!.product.store;
  if (parsed.data.fulfillmentType === "DELIVERY" && store.plan === "FREE") {
    return NextResponse.json(
      { ok: false, error: "Los envíos a domicilio requieren membresía Vende+. Elige recoger en tienda." },
      { status: 400 },
    );
  }
  if (!isStoreOpen(store)) {
    return NextResponse.json(
      { ok: false, error: "La tienda está cerrada en este momento." },
      { status: 400 },
    );
  }

  const outOfStock = items.find(
    (cartItem: typeof items[number]) => {
      if (cartItem.product.stock === -1 || cartItem.product.stock === null) return false;
      if (cartItem.product.sellByWeight) {
        return cartItem.product.stock < cartItem.weightGrams! * cartItem.quantity;
      }
      return cartItem.product.stock < cartItem.quantity;
    },
  );
  if (outOfStock) {
    const detail = outOfStock.product.sellByWeight
      ? `solo tiene ${outOfStock.product.stock}g disponibles.`
      : `solo tiene ${outOfStock.product.stock} unidades disponibles.`;
    return NextResponse.json(
      { ok: false, error: `El producto "${outOfStock.product.name}" ${detail}` },
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

  const activePromotions = await prisma.promotion.findMany({
    where: {
      storeId,
      isActive: true,
      OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }],
    },
    include: {
      products: { select: { productId: true, promoPriceCents: true, quantity: true } },
    },
  });

  const promoMap = new Map<string, { promoPriceCents: number | null; discountPercentage: number | null; quantity: number; requiresCoupon: boolean }>();
  for (const promo of activePromotions) {
    for (const pp of promo.products) {
      promoMap.set(pp.productId, { promoPriceCents: pp.promoPriceCents, discountPercentage: promo.discountPercentage, quantity: pp.quantity, requiresCoupon: promo.requiresCoupon });
    }
  }

  const subtotalCents = items.reduce(
    (sum: number, cartItem: typeof items[number]) => {
      let price = cartItem.variant?.priceCents ?? cartItem.product.priceCents;
      const promo = promoMap.get(cartItem.product.id);
      if (promo && (!promo.requiresCoupon || parsed.data.couponCode)) {
        if (promo.promoPriceCents != null) {
          price = promo.promoPriceCents;
        } else if (promo.discountPercentage && promo.discountPercentage > 0) {
          price = Math.round(price * (1 - promo.discountPercentage / 100));
        }
      } else if (cartItem.product.isPromotion && cartItem.product.promotionPriceCents != null) {
        if (!cartItem.product.promotionEndDate || new Date(cartItem.product.promotionEndDate) >= new Date()) {
          price = cartItem.product.promotionPriceCents;
        }
      }
      if (cartItem.product.sellByWeight && cartItem.weightGrams) {
        return sum + Math.round((cartItem.weightGrams / 1000) * price) * cartItem.quantity;
      }
      return sum + cartItem.quantity * price;
    },
    0,
  );
  let deliveryCents = 0;
  if (parsed.data.fulfillmentType === "DELIVERY") {
    const customerLat = parsed.data.customerLat;
    const customerLng = parsed.data.customerLng;
    const settings = await prisma.deliverySettings.findUnique({ where: { id: 1 } });
    const feeConfig: DeliveryFeeConfig | undefined = settings
      ? {
          baseFeeCents: settings.baseFeeCents,
          extraFeePerSegmentCents: settings.extraFeePerSegmentCents,
          baseDistanceKm: settings.baseDistanceKm,
          segmentKm: settings.segmentKm,
          fallbackFeeCents: settings.fallbackFeeCents,
        }
      : undefined;
    if (customerLat && customerLng) {
      const storeLat = store.latitude;
      const storeLng = store.longitude;
      if (storeLat && storeLng) {
        const routeKm = await getRouteDistanceKm(storeLat, storeLng, customerLat, customerLng);
        const distance = routeKm ?? haversineDistance(storeLat, storeLng, customerLat, customerLng);
        deliveryCents = calcDeliveryFeeCents(distance, feeConfig);
      } else {
        deliveryCents = feeConfig?.fallbackFeeCents ?? 2500;
      }
      const zones = await prisma.deliveryZone.findMany({
        where: { isActive: true },
        select: { polygon: true },
      });
      const riskZoneCount = zones.filter((z) =>
        pointInPolygon(customerLat, customerLng, z.polygon as { lat: number; lng: number }[]),
      ).length;
      deliveryCents += riskZoneCount * RISK_ZONE_EXTRA_CENTS;
    } else {
      deliveryCents = feeConfig?.fallbackFeeCents ?? 2500;
    }
  }
  let couponDiscountCents = 0;
  let couponId: string | undefined;
  if (parsed.data.couponCode) {
    const code = parsed.data.couponCode.toUpperCase().trim();
    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: { stores: { select: { storeId: true } } },
    });
    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ ok: false, error: "Cupón inválido o inactivo." }, { status: 400 });
    }
    if (!coupon.stores.some((s) => s.storeId === storeId)) {
      return NextResponse.json({ ok: false, error: "Este cupón no es válido para esta tienda." }, { status: 400 });
    }
    const couponUsers = await prisma.couponUser.findMany({ where: { couponId: coupon.id }, select: { userId: true } });
    if (couponUsers.length > 0 && !couponUsers.some((u) => u.userId === auth.userId)) {
      return NextResponse.json({ ok: false, error: "Este cupón no está disponible para tu cuenta." }, { status: 400 });
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
    if (coupon.minPurchaseCents && subtotalCents < coupon.minPurchaseCents) {
      return NextResponse.json({ ok: false, error: `Compra mínima de $${(coupon.minPurchaseCents / 100).toFixed(2)} para este cupón.` }, { status: 400 });
    }
    if (coupon.maxUsesPerUser) {
      const userUsage = await prisma.order.count({
        where: { userId: auth.userId, couponId: coupon.id },
      });
      if (userUsage >= coupon.maxUsesPerUser) {
        return NextResponse.json({ ok: false, error: "Ya usaste este cupón el máximo de veces permitido." }, { status: 400 });
      }
    }
    if (coupon.userRegisteredBefore || coupon.storeCreatedBefore) {
      const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { createdAt: true } });
      const storeRecord = await prisma.store.findUnique({ where: { id: storeId }, select: { createdAt: true } });
      if (coupon.userRegisteredBefore && user && user.createdAt >= coupon.userRegisteredBefore) {
        return NextResponse.json({ ok: false, error: "Este cupón es solo para usuarios registrados antes de " + coupon.userRegisteredBefore.toLocaleDateString("es-MX") + "." }, { status: 400 });
      }
      if (coupon.storeCreatedBefore && storeRecord && storeRecord.createdAt >= coupon.storeCreatedBefore) {
        return NextResponse.json({ ok: false, error: "Este cupón es solo para tiendas creadas antes de " + coupon.storeCreatedBefore.toLocaleDateString("es-MX") + "." }, { status: 400 });
      }
    }
    if (coupon.discountType === "PERCENTAGE") {
      couponDiscountCents = Math.round((subtotalCents * coupon.discountValue) / 100);
    } else {
      couponDiscountCents = coupon.discountValue;
    }
    if (couponDiscountCents > subtotalCents) couponDiscountCents = subtotalCents;
    couponId = coupon.id;
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
  }
  const totalCents = subtotalCents + deliveryCents - couponDiscountCents;
  const deliveryCode = generateDeliveryCode();
  const pickupCode = generateDeliveryCode();

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
      couponDiscountCents: couponDiscountCents > 0 ? couponDiscountCents : null,
      couponId: couponId || null,
      deliveryCode,
      pickupCode,
      items: {
        create: items.map((cartItem: typeof items[number]) => {
          let effectivePrice = cartItem.variant?.priceCents ?? cartItem.product.priceCents;
          const promo = promoMap.get(cartItem.product.id);
          if (promo && (!promo.requiresCoupon || parsed.data.couponCode)) {
            if (promo.promoPriceCents != null) {
              effectivePrice = promo.promoPriceCents;
            } else if (promo.discountPercentage && promo.discountPercentage > 0) {
              effectivePrice = Math.round(effectivePrice * (1 - promo.discountPercentage / 100));
            }
          } else if (cartItem.product.isPromotion && cartItem.product.promotionPriceCents != null) {
            if (!cartItem.product.promotionEndDate || new Date(cartItem.product.promotionEndDate) >= new Date()) {
              effectivePrice = cartItem.product.promotionPriceCents;
            }
          }
          return {
            productId: cartItem.product.id,
            name: cartItem.product.name,
            priceCents: effectivePrice,
            quantity: cartItem.quantity,
            weightGrams: cartItem.weightGrams || null,
            variantName: cartItem.variant?.name || null,
            variantId: cartItem.variantId,
          };
        }),
      },
    },
    select: { id: true },
  });

  await prisma.cartItem.deleteMany({ where: { userId: auth.userId } });

  revalidatePath("/vendor/pedidos");

  for (const cartItem of items) {
    if (cartItem.product.stock !== -1 && cartItem.product.stock !== null) {
      const decrement = cartItem.product.sellByWeight && cartItem.weightGrams
        ? cartItem.weightGrams * cartItem.quantity
        : cartItem.quantity;
      await prisma.product.update({
        where: { id: cartItem.product.id },
        data: { stock: { decrement } },
      });
    }
  }

  const storeForNotification = await prisma.store.findUnique({
    where: { id: storeId },
    select: { phone: true, name: true, ownerId: true, owner: { select: { phone: true, pushToken: true } } },
  });

  if (storeForNotification) {
    const vendorPhone = storeForNotification.phone || storeForNotification.owner.phone;
    const orderItems = items.map((cartItem: typeof items[number]) => ({
      name: cartItem.product.name,
      quantity: cartItem.quantity,
    }));

    const notifications: Promise<unknown>[] = [
      sendTextNotification(storeForNotification.ownerId, {
        title: "Nuevo pedido!",
        body: `${parsed.data.customerName} hizo un pedido de $${(totalCents / 100).toFixed(2)} ${currency}`,
        type: "NEW_ORDER",
        url: "/vendor/pedidos",
      }),
    ];

    if (storeForNotification.owner.pushToken) {
      notifications.push(
        sendPushNotification(storeForNotification.owner.pushToken, {
          title: "Nuevo pedido!",
          body: `${parsed.data.customerName} - $${(totalCents / 100).toFixed(2)} ${currency}`,
          url: "/vendor/pedidos",
          type: "NEW_ORDER",
        }),
      );
    }

    if (vendorPhone) {
      notifications.push(
        notifyVendorNewOrder({
          vendorPhone,
          storeName: storeForNotification.name,
          customerName: parsed.data.customerName.trim(),
          customerPhone: parsed.data.customerPhone.trim(),
          customerAddress: parsed.data.customerAddress?.trim() || null,
          totalCents,
          currency,
          fulfillmentType: parsed.data.fulfillmentType,
          orderId: order.id,
          items: orderItems,
        }),
      );
    }

    await Promise.allSettled(notifications);
  }

  if (parsed.data.fulfillmentType === "DELIVERY") {
    const drivers = await prisma.user.findMany({
      where: { role: "DELIVERY", isActive: true },
      select: { id: true, pushToken: true },
    });
    if (drivers.length > 0) {
      const driverNotifyPromises = drivers.map((d) =>
        sendTextNotification(d.id, {
          title: "Nuevo pedido disponible",
          body: `${storeForNotification?.name || "Tienda"} — ${parsed.data.customerName.trim()}${parsed.data.customerAddress ? ` | ${parsed.data.customerAddress.trim()}` : ""}`,
          type: "NEW_ORDER",
          url: "/delivery",
        }),
      );
      const driverTokens = drivers.map((d) => d.pushToken).filter((t): t is string => Boolean(t));
      if (driverTokens.length > 0) {
        driverNotifyPromises.push(
          sendPushToMultiple(driverTokens, {
            title: "Nuevo pedido disponible",
            body: `${storeForNotification?.name || "Tienda"} — ${parsed.data.customerName.trim()}`,
            url: "/delivery",
            type: "NEW_ORDER",
          }),
        );
      }
      await Promise.allSettled(driverNotifyPromises);
    }
  }

  let paymentUrl: string | undefined;
  let mpError: string | undefined;

  if (parsed.data.paymentMethod === "ONLINE") {
    const paymentMethod = await prisma.storePaymentMethod.findFirst({
      where: { storeId, processor: "MERCADO_PAGO", isActive: true, status: "APPROVED" },
      select: { credentials: true },
    });

    if (paymentMethod?.credentials) {
      const encrypted = paymentMethod.credentials;
      const base64 = Buffer.from(encrypted, "hex").toString("utf8");
      const json = Buffer.from(base64, "base64").toString("utf8");
      const creds = JSON.parse(json);
      const accessToken = creds.accessToken;

      try {
        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            items: [
              ...items.map((item: typeof items[number]) => {
                const basePrice = item.variant?.priceCents ?? item.product.priceCents;
                if (item.product.sellByWeight && item.weightGrams) {
                  const totalPrice = Math.round((item.weightGrams / 1000) * basePrice) * item.quantity;
                  return {
                    title: `${item.product.name} (${item.weightGrams}g)`,
                    quantity: 1,
                    unit_price: totalPrice / 100,
                    currency_id: "MXN",
                  };
                }
                return {
                  title: item.variant ? `${item.product.name} (${item.variant.name})` : item.product.name,
                  quantity: item.quantity,
                  unit_price: basePrice / 100,
                  currency_id: "MXN",
                };
              }),
              ...(deliveryCents > 0
                ? [{ title: "Costo de envío", quantity: 1, unit_price: deliveryCents / 100, currency_id: "MXN" }]
                : []),
            ],
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
