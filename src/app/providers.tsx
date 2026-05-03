"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { App } from "@capacitor/app";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Escuchar el botón físico de atrás
    const handleBackButton = async () => {
      await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          // Si el navegador tiene historial, regresa una página
          window.history.back();
        } else {
          // Si ya no hay más historial (estás en el inicio), cierra la app
          App.exitApp();
        }
      });
    };

    handleBackButton();

    // Limpiar el evento al desmontar
    return () => {
      App.removeAllListeners();
    };
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}

