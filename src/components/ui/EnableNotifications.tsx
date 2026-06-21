"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function EnableNotifications() {
  const [status, setStatus] = useState<"granted" | "denied" | "default" | "loading">("loading");

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setStatus("denied");
      return;
    }
    setStatus(Notification.permission as "granted" | "denied" | "default");
  }, []);

  async function requestPermission() {
    if (Capacitor.isNativePlatform()) {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive !== "granted") {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive === "granted") {
          await PushNotifications.register();
          PushNotifications.addListener("registration", async (token) => {
            await fetch("/api/push-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pushToken: token.value }),
            });
            setStatus("granted");
            toast.success("Notificaciones activadas");
          });
        } else {
          setStatus("denied");
          toast.error("Permiso denegado. Actívalo desde Configuración > Notificaciones");
        }
      } catch { toast.error("Error al activar notificaciones"); }
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        const { getMessaging, getToken } = await import("firebase/messaging");
        const { initializeApp, getApps } = await import("firebase/app");

        const firebaseConfig = {
          apiKey: "AIzaSyB-MUsv6a09s1qzLpsIrUGKozf_hyzZHoU",
          authDomain: "mercadito-ocoyoacac.firebaseapp.com",
          projectId: "mercadito-ocoyoacac",
          storageBucket: "mercadito-ocoyoacac.firebasestorage.app",
          messagingSenderId: "67218965388",
          appId: "1:67218965388:web:13b50f716af87a93f40ca9",
        };
        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        let swReg: ServiceWorkerRegistration | null = null;
        try {
          swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        } catch {}

        const token = await getToken(messaging, {
          vapidKey: "BICOYmtP5zDfdSVEgsZ5Ad2h0HyIIJ32HZKpSl9If-Cbq8Jx_zlvdQFtk2NIbjSwX27fje5Tf-TVmMaNN_sIrGQ",
          serviceWorkerRegistration: swReg || undefined,
        });

        await fetch("/api/push-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pushToken: token }),
        });

        setStatus("granted");
        toast.success("Notificaciones activadas");
      } else {
        setStatus("denied");
        toast.error("Permiso denegado. Actívalo desde la configuración del navegador");
      }
    } catch { toast.error("Error al activar notificaciones"); }
  }

  if (status === "loading") return null;
  if (status === "granted") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Notificaciones activadas
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestPermission}
      className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
    >
      {status === "denied"
        ? "Reactivar notificaciones (abrir configuración)"
        : "Activar notificaciones"}
    </button>
  );
}
