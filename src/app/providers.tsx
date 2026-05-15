"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Capacitor } from "@capacitor/core";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      initNativePush();
    } else {
      initWebPush();
    }

    return () => {};
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}

async function initNativePush() {
  const { App } = await import("@capacitor/app");
  const { PushNotifications } = await import("@capacitor/push-notifications");

  await App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  try {
    setTimeout(async () => {
      let perm = await PushNotifications.checkPermissions();

      if (perm.receive !== "granted") {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive === "granted") {
        await PushNotifications.register();

        PushNotifications.addListener("registration", async (token) => {
          try {
            await fetch("/api/push-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pushToken: token.value }),
            });
          } catch (err) {
            console.error("Error guardando push token:", err);
          }
        });

        PushNotifications.addListener("pushNotificationReceived", (n) => {
          console.log("Notificación recibida (native):", n);
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (n) => {
          console.log("Usuario tocó notificación (native):", n);
        });
      }
    }, 1000);
  } catch (error) {
    console.error("Error configurando Push nativo:", error);
  }
}

async function initWebPush() {
  try {
    const { requestWebPushToken, onForegroundMessage } = await import(
      "@/lib/firebase-web"
    );

    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;

    const token = await requestWebPushToken();
    if (token) {
      await fetch("/api/push-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushToken: token }),
      });
    }

    onForegroundMessage((payload) => {
      const notification = payload.notification || {};
      const data = payload.data || {};
      const title = notification.title || data.title || "";
      const body = notification.body || data.body || "";
      if (title) {
        new Notification(title, { body, icon: "/Logo MO.png" });
      }
    });
  } catch (error) {
    console.error("Error configurando Push web:", error);
  }
}

