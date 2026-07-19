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
