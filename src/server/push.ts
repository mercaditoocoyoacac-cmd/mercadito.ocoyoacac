import admin from "firebase-admin";
import { prisma } from "@/server/prisma";

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
      role: "ADMIN",
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
