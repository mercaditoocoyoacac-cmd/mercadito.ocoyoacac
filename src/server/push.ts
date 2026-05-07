import admin from "firebase-admin";

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
    }
  } catch (error) {
    console.error("Firebase admin initialization failed:", error);
  }
}

export async function sendPushNotification(token: string, data: { title: string; body: string }) {
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

export async function sendPushToMultiple(tokens: string[], data: { title: string; body: string }) {
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
    console.log(`Push notifications sent: ${response.successCount} succeeded, ${response.failureCount} failed`);
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }
}
