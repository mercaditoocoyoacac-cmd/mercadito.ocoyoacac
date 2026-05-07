"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { App } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Manejo del botón atrás
    const handleBackButton = async () => {
      await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    };

    // 2. Configuración de Notificaciones Push
    const setupPush = async () => {
      try {
        // Pequeña espera para asegurar que el hardware esté listo
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Pedir permisos de forma más directa
        let perm = await PushNotifications.checkPermissions();

        if (perm.receive !== 'granted') {
          perm = await PushNotifications.requestPermissions();
        }

        if (perm.receive === 'granted') {
          // Registrar el dispositivo en Firebase
          await PushNotifications.register();
          console.log('Permiso de notificaciones concedido');

          // Escuchar el token de FCM y guardarlo
          await PushNotifications.addListener('registration', async (token) => {
            console.log('FCM Token:', token.value);
            try {
              const response = await fetch('/api/push-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pushToken: token.value }),
              });
              if (response.ok) {
                console.log('Push token guardado');
              }
            } catch (err) {
              console.error('Error guardando push token:', err);
            }
          });
        } else {
          console.log('Permiso de notificaciones denegado');
        }
      } catch (error) {
        console.error('Error configurando Push:', error);
      }
    };

    handleBackButton();
    setupPush();

    return () => {
      App.removeAllListeners();
      PushNotifications.removeAllListeners();
    };
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}

