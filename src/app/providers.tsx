"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { LayoutGroup } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import SplashScreen from "@/components/ui/SplashScreen";
import { SwipeBack } from "@/components/ui/SwipeBack";

function emitBubble(detail: { title: string; body: string; url?: string; type?: string }) {
  window.dispatchEvent(new CustomEvent("push-bubble", { detail }));
}

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

  return (
    <SessionProvider>
      <LayoutGroup>
        <SplashScreen>
          <SwipeBack>{children}</SwipeBack>
        </SplashScreen>
      </LayoutGroup>
    </SessionProvider>
  );
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
          const payload = n.data as Record<string, string> | undefined;
          const title = n.title || payload?.title || "";
          const body = n.body || payload?.body || "";
          if (title) {
            emitBubble({ title, body, url: payload?.url, type: payload?.type });
          }
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (n) => {
          const notif = n.notification;
          const data = notif.data as Record<string, string> | undefined;
          const title = notif.title || data?.title || "";
          const body = notif.body || data?.body || "";
          if (title) {
            emitBubble({ title, body, url: data?.url, type: data?.type });
          }
        });

        // Show bubbles for any delivered notifications when app resumes
        App.addListener("appStateChange", async ({ isActive }) => {
          if (isActive) {
            const delivered = await PushNotifications.getDeliveredNotifications();
            for (const n of delivered.notifications) {
              const data = n.data as Record<string, string> | undefined;
              const title = n.title || data?.title || "";
              const body = n.body || data?.body || "";
              if (title) {
                emitBubble({ title, body, url: data?.url, type: data?.type });
              }
            }
            if (delivered.notifications.length > 0) {
              await PushNotifications.removeAllDeliveredNotifications();
            }
          }
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
        window.dispatchEvent(new CustomEvent("push-bubble", {
          detail: { title, body, url: data.url, type: data.type },
        }));
      }
    });
  } catch (error) {
    console.error("Error configurando Push web:", error);
  }
}

