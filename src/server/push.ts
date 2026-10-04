import admin from "firebase-admin";
import { prisma } from "@/server/prisma";
import { isStoreOpenToday } from "@/lib/schedule";
import { hasCompleteDocs, missingDocs, stripDeliveryRole } from "@/server/driverDocs";
import type { Role } from "@prisma/client";

const CATEGORY_SPOTLIGHT: Record<string, { emoji: string; phrase: string }> = {
  CANASTA_BASICA: { emoji: "🛒", phrase: "Tu despensa básica de todos los días" },
  COMIDA_PREPARADA: { emoji: "🍽️", phrase: "Comida preparada y antojitos" },
  POSTRES: { emoji: "🍰", phrase: "Postres y antojos dulces" },
  FRUTAS_VERDURAS: { emoji: "🥬", phrase: "Frutas y verduras frescas" },
  HERRAMIENTAS: { emoji: "🔧", phrase: "Herramientas y artículos del hogar" },
  FLORERIAS: { emoji: "💐", phrase: "Flores y regalos" },
  FARMACIAS: { emoji: "💊", phrase: "Farmacia y cuidado de tu salud" },
  BELLEZA: { emoji: "💅", phrase: "Salud y belleza" },
  PAPE: { emoji: "🎁", phrase: "Papelería y regalos" },
  SERVICIOS: { emoji: "🛠️", phrase: "Servicios de confianza" },
  OTROS: { emoji: "🏪", phrase: "Un negocio local de confianza" },
};

function buildStoreSpotlight(store: {
  name: string;
  slug: string;
  category: string;
  description: string | null;
}) {
  const fallback = CATEGORY_SPOTLIGHT[store.category] ?? CATEGORY_SPOTLIGHT.OTROS;
  const raw = (store.description ?? "").replace(/\s+/g, " ").trim();
  let snippet: string;
  if (raw) {
    const sentenceEnd = raw.search(/[.!?](?=\s|$)/);
    let truncated = false;
    if (sentenceEnd > 0) {
      snippet = raw.slice(0, sentenceEnd + 1).trim().replace(/[.!?…\s]+$/, "");
    } else {
      snippet = raw.slice(0, 88);
      const cut = snippet.lastIndexOf(" ");
      if (cut > 24) snippet = snippet.slice(0, cut);
      snippet = snippet.replace(/[.!?…\s]+$/, "");
      truncated = snippet.length < raw.length;
    }
    if (snippet.length > 100) {
      const cut = snippet.slice(0, 100).lastIndexOf(" ");
      if (cut > 24) snippet = snippet.slice(0, cut);
      truncated = true;
    }
    snippet = `${fallback.emoji} ${snippet}${truncated ? "…" : ""}`;
  } else {
    snippet = `${fallback.emoji} ${fallback.phrase}`;
  }
  const body = snippet.endsWith("…")
    ? `${snippet} ¡Pídelo por Mercadito Ocoyoacac!`
    : `${snippet}. ¡Pídelo por Mercadito Ocoyoacac!`;
  return {
    title: `🏪 Conoce ${store.name}`,
    body,
    url: `/tienda/${store.slug}`,
  };
}

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccountJson) {
    console.warn("FIREBASE_SERVICE_ACCOUNT not set, push notifications disabled");
    return;
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
  } catch (error) {
    console.error("Firebase admin initialization failed:", error);
  }
}

const LOGO_URL = "https://mercadito-ocoyoacac.vercel.app/Logo%20MO.png";

interface PushData {
  title: string;
  body: string;
  url?: string;
  type?: string;
  orderId?: string;
}

export async function sendPushNotification(token: string, data: PushData) {
  ensureInitialized();
  
  if (!initialized) {
    console.warn("Firebase not initialized, skipping push notification");
    return;
  }

  try {
    await admin.messaging().send({
      token,
      notification: {
        title: data.title,
        body: data.body,
      },
      data: {
        url: data.url || "",
        type: data.type || "",
        orderId: data.orderId || "",
      },
      android: {
        notification: {
          channelId: "order_notifications",
          sound: "default",
          imageUrl: LOGO_URL,
          icon: "ic_notification",
          color: "#2563eb",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

export async function sendLocationPing(token: string, orderId: string) {
  ensureInitialized();

  if (!initialized) return false;

  try {
    await admin.messaging().send({
      token,
      data: {
        type: "LOCATION_PING",
        orderId,
      },
      android: {
        priority: "high",
        ttl: 20_000,
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            "content-available": 1,
          },
        },
      },
    });
    return true;
  } catch (error) {
    console.error("Error sending location ping:", error);
    return false;
  }
}

export async function sendPushToMultiple(tokens: string[], data: PushData) {
  ensureInitialized();
  
  if (!initialized) {
    console.warn("Firebase not initialized, skipping push notifications");
    return;
  }

  if (tokens.length === 0) return;

  try {
    const messages = tokens.map(token => ({
      token,
      notification: {
        title: data.title,
        body: data.body,
      },
      data: {
        url: data.url || "",
        type: data.type || "",
        orderId: data.orderId || "",
      },
      android: {
        notification: {
          channelId: "order_notifications",
          sound: "default",
          imageUrl: LOGO_URL,
          icon: "ic_notification",
          color: "#2563eb",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    }));

    const response = await admin.messaging().sendEach(messages);
    if (response.failureCount > 0) {
      response.responses.forEach((r, i) => {
        if (r.error) {
          console.error(`Push failed for token ${i}:`, r.error.message);
        }
      });
    }
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }
}

export async function broadcastPromotion(data: {
  storeName: string;
  productName: string;
  discountPercentage: number | null;
}) {
  const users = await prisma.user.findMany({
    where: { pushToken: { not: null } },
    select: { pushToken: true },
  });
  const tokens = users.map((u) => u.pushToken).filter(Boolean) as string[];
  if (tokens.length === 0) return;

  const discountText = data.discountPercentage
    ? ` -${data.discountPercentage}%`
    : "";
  await sendPushToMultiple(tokens, {
    title: `🎉 Promoción en ${data.storeName}`,
    body: `${data.productName}${discountText}`,
    url: "/tiendas",
    type: "PROMOTION",
  });
  console.log(`[PUSH] Promoción enviada a ${tokens.length} dispositivos`);
}

export async function sendPushToAdmins(data: PushData) {
  const admins = await prisma.user.findMany({
    where: {
      pushToken: { not: null },
      OR: [
        { role: "ADMIN" },
        { additionalRoles: { contains: "ADMIN" } },
      ],
    },
    select: { pushToken: true },
  });
  const tokens = admins.map((a) => a.pushToken).filter(Boolean) as string[];
  if (tokens.length === 0) return;
  await sendPushToMultiple(tokens, data);
  console.log(`[PUSH] Notificación enviada a ${tokens.length} administradores`);
}

export async function sendVendorReminder() {
  const vendors = await prisma.user.findMany({
    where: {
      pushToken: { not: null },
      OR: [
        { role: "VENDOR" },
        { additionalRoles: { contains: "VENDOR" } },
      ],
    },
    select: { pushToken: true, id: true },
  });

  if (vendors.length === 0) {
    console.log("[CRON] No vendors with push tokens found");
    return;
  }

  const tokens = vendors.map((v) => v.pushToken).filter(Boolean) as string[];

  const reminders = [
    {
      title: "📋 Recuerda actualizar tus productos",
      body: "Mantén tu catálogo al día para que tus clientes vean lo mejor de tu tienda. ¡Los productos actualizados venden más!",
      url: "/vendor/productos",
      type: "VENDOR_REMINDER",
    },
    {
      title: "⭐ Tu tienda en Mercadito Ocoyoacac",
      body: "Revisa que tus precios, fotos y descripciones estén actualizados. ¡Nosotros te ayudamos a crecer!",
      url: "/vendor/mi-tienda",
      type: "VENDOR_REMINDER",
    },
  ];

  const reminder = reminders[new Date().getDay() % reminders.length];

  await sendPushToMultiple(tokens, reminder);
  console.log(`[CRON] Vendor reminder sent to ${tokens.length} devices`);
}

export async function sendEmptyStoreSuspensionWarning() {
  const storesWithoutProducts = await prisma.store.findMany({
    where: {
      isActive: true,
      products: { none: {} },
    },
    include: {
      owner: { select: { pushToken: true, id: true, name: true } },
    },
  });

  if (storesWithoutProducts.length === 0) {
    console.log("[CRON] No active stores without products found");
    return;
  }

  const tokens = storesWithoutProducts
    .map((s) => s.owner?.pushToken)
    .filter(Boolean) as string[];

  if (tokens.length === 0) {
    console.log("[CRON] No store owners with push tokens found");
    return;
  }

  await sendPushToMultiple(tokens, {
    title: "⚠️ Tu tienda será suspendida el 1 de septiembre",
    body: "Hola! Notamos que tu tienda no tiene productos registrados. A partir del 1ro de septiembre de 2026, las tiendas sin productos serán suspendidas. Agrega al menos un producto en /vendor/productos para mantener tu tienda activa. ¡Estamos para ayudarte!",
    url: "/vendor/productos",
    type: "STORE_SUSPENSION_WARNING",
  });

  console.log(
    `[CRON] Suspension warning sent to ${tokens.length} store owners (${storesWithoutProducts.length} stores without products)`
  );
}

export async function sendDriverDocsReminder() {
  const drivers = await prisma.user.findMany({
    where: {
      pushToken: { not: null },
      OR: [
        { role: "DELIVERY" },
        { additionalRoles: { contains: "DELIVERY" } },
      ],
    },
    select: {
      pushToken: true,
      vehiclePhotoUrl: true,
      licensePhotoUrl: true,
      personPhotoUrl: true,
      officialIdPhotoUrl: true,
      driverDocsApproved: true,
    },
  });

  const pending = drivers.filter((d) => !hasCompleteDocs(d));
  if (pending.length === 0) {
    console.log("[CRON] No hay repartidores con documentos pendientes");
    return 0;
  }

  const tokens = pending.map((d) => d.pushToken).filter(Boolean) as string[];
  const sample = pending[0];
  const faltan = missingDocs(sample);

  await sendPushToMultiple(tokens, {
    title: "📄 Completa tus documentos de repartidor",
    body: `Te faltan: ${faltan.join(", ")}. Sube tus 4 documentos antes del 15 de octubre para seguir repartiendo.`,
    url: "/delivery/documentos",
    type: "DRIVER_DOCS",
  });
  console.log(`[CRON] Driver docs reminder sent to ${tokens.length} devices (${pending.length} repartidores)`);
  return pending.length;
}

export async function stripDriversWithoutDocs() {
  const drivers = await prisma.user.findMany({
    where: {
      OR: [
        { role: "DELIVERY" },
        { additionalRoles: { contains: "DELIVERY" } },
      ],
    },
    select: {
      id: true,
      email: true,
      role: true,
      additionalRoles: true,
      vehiclePhotoUrl: true,
      licensePhotoUrl: true,
      personPhotoUrl: true,
      officialIdPhotoUrl: true,
      driverDocsApproved: true,
    },
  });

  const toStrip = drivers.filter((d) => !hasCompleteDocs(d));
  let stripped = 0;

  for (const user of toStrip) {
    const next = stripDeliveryRole(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { role: next.role as Role, additionalRoles: next.additionalRoles },
    });
    stripped++;
  }

  if (stripped > 0) {
    await sendPushToAdmins({
      title: "⚠️ Repartidores sin documentos",
      body: `Se retiró el status de repartidor a ${stripped} cuenta(s) por no registrar sus documentos a tiempo.`,
      url: "/admin/repartidores",
      type: "DRIVER_DOCS",
    });
  }

  console.log(`[CRON] Driver docs strip: ${stripped}/${toStrip.length} repartidores sin documentos`);
  return stripped;
}

export async function sendPromotionsToStoreCustomers(storeId: string, storeName: string) {
  const promoRows = await prisma.promotion.findMany({
    where: {
      storeId,
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      lastPromoNotifiedAt: true,
    },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const toNotify = promoRows.filter(
    (p) => !p.lastPromoNotifiedAt || p.lastPromoNotifiedAt < todayStart
  );

  if (toNotify.length === 0) return;

  const customerIds = await prisma.order.findMany({
    where: { storeId },
    select: { userId: true },
    distinct: ["userId"],
  });

  if (customerIds.length === 0) return;

  const userIds = customerIds.map((c) => c.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, pushToken: { not: null } },
    select: { pushToken: true },
  });

  const tokens = users.map((u) => u.pushToken).filter(Boolean) as string[];
  if (tokens.length === 0) return;

  for (const promo of toNotify) {
    const body = promo.description || promo.title;
    await sendPushToMultiple(tokens, {
      title: `🔥 ¡Promociones de ${storeName}!`,
      body,
      url: `/tiendas`,
      type: "PROMOTION",
    });
    await prisma.promotion.update({
      where: { id: promo.id },
      data: { lastPromoNotifiedAt: new Date() },
    });
    console.log(`[PUSH] Promo "${promo.title}" → ${tokens.length} clientes de ${storeName}`);
  }
}

export async function sendDailyCustomerReminder() {
  const users = await prisma.user.findMany({
    where: {
      pushToken: { not: null },
      role: "CUSTOMER",
      isActive: true,
    },
    select: { pushToken: true, id: true },
  });

  if (users.length === 0) {
    console.log("[CRON] No active customers with push tokens found");
    return;
  }

  const tokens = users.map((u) => u.pushToken).filter(Boolean) as string[];

  const memberStores = await prisma.store.findMany({
    where: {
      isActive: true,
      isPublished: true,
      plan: { in: ["MEMBER", "SOLO_DELIVERY"] },
      subscription: {
        is: {
          status: { in: ["ACTIVE", "TRIAL"] },
          endDate: { gt: new Date() },
        },
      },
    },
    select: {
      name: true,
      slug: true,
      category: true,
      description: true,
      openTime: true,
      closeTime: true,
      scheduleDays: true,
      scheduleDetails: true,
    },
    orderBy: { name: "asc" },
  });

  const openStores = memberStores.filter((s) => isStoreOpenToday(s));

  if (openStores.length > 0) {
    const dayIndex = Math.floor(Date.now() / 86400000);
    const store = openStores[dayIndex % openStores.length];
    const spotlight = buildStoreSpotlight(store);
    await sendPushToMultiple(tokens, {
      title: spotlight.title,
      body: spotlight.body,
      url: spotlight.url,
      type: "STORE_SPOTLIGHT",
    });
    console.log(`[CRON] Store spotlight (${store.name}) → ${tokens.length} devices (${openStores.length} abiertos hoy)`);
    return;
  }

  const messages = [
    {
      title: "🍽️ ¿Se te antoja algo?",
      body: "Pídelo por Mercadito Ocoyoacac y recíbelo en la puerta de tu casa. ¡Rápido, fácil y delicioso!",
      url: "/tiendas",
      type: "DAILY_REMINDER",
    },
    {
      title: "😋 ¿Hambre? ¡Mercadito te salva!",
      body: "Tus tiendas favoritas de Ocoyoacac a un toque. Haz tu pedido ahora y disfruta sin cocinar.",
      url: "/tiendas",
      type: "DAILY_REMINDER",
    },
    {
      title: "🛍️ ¿Qué se te antoja hoy?",
      body: "Descubre promociones y nuevos productos en Mercadito Ocoyoacac. ¡Tu antojo te espera!",
      url: "/tiendas",
      type: "DAILY_REMINDER",
    },
    {
      title: "🌮 Antojo repentino?",
      body: "Ordena en Mercadito Ocoyoacac y recíbelo en minutos. ¡No dejes que el hambre te gane!",
      url: "/tiendas",
      type: "DAILY_REMINDER",
    },
    {
      title: "🥤 ¿Sed o antojo?",
      body: "Refrescos, snacks, comida casera... todo en Mercadito Ocoyoacac. Pide ahora y relájate.",
      url: "/tiendas",
      type: "DAILY_REMINDER",
    },
  ];

  const message = messages[new Date().getDay() % messages.length];

  await sendPushToMultiple(tokens, message);
  console.log(`[CRON] Daily customer reminder sent to ${tokens.length} devices`);
}
