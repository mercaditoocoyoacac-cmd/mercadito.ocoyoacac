import admin from "firebase-admin";

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

interface PushData {
  title: string;
  body: string;
  url?: string;
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
      data: data.url ? { url: data.url } : undefined,
      android: {
        notification: {
          channelId: "order_notifications",
          sound: "default",
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
      data: data.url ? { url: data.url } : undefined,
      android: {
        notification: {
          channelId: "order_notifications",
          sound: "default",
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
