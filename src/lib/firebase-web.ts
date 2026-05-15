import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyB-MUsv6a09s1qzLpsIrUGKozf_hyzZHoU",
  authDomain: "mercadito-ocoyoacac.firebaseapp.com",
  projectId: "mercadito-ocoyoacac",
  storageBucket: "mercadito-ocoyoacac.firebasestorage.app",
  messagingSenderId: "67218965388",
  appId: "1:67218965388:web:13b50f716af87a93f40ca9",
  measurementId: "G-RXLQ2FBRQM",
};

const VAPID_KEY = "BICOYmtP5zDfdSVEgsZ5Ad2h0HyIIJ32HZKpSl9If-Cbq8Jx_zlvdQFtk2NIbjSwX27fje5Tf-TVmMaNN_sIrGQ";

let swRegistration: ServiceWorkerRegistration | null = null;

function getApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

async function ensureSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;
  try {
    swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    return swRegistration;
  } catch {
    return null;
  }
}

export type PushPayload = MessagePayload;

export async function requestWebPushToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return null;

    const reg = await ensureSWRegistration();
    const app = getApp();
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg || undefined,
    });

    return token;
  } catch {
    return null;
  }
}

export function onForegroundMessage(callback: (payload: PushPayload) => void): () => void {
  if (typeof window === "undefined") return () => {};

  try {
    const app = getApp();
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, callback);
    return unsubscribe;
  } catch {
    return () => {};
  }
}
