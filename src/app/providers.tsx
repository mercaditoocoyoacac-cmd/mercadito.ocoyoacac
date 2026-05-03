"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { App } from "@capacitor/app";
import { useRouter, usePathname } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const setupBackButton = async () => {
      const backButtonHandler = await App.addListener('backButton', ({ canGoBack }) => {
        // Si no estamos en la página principal, intentamos ir atrás
        if (pathname !== "/" && pathname !== "/login") {
            window.history.back();
        } else {
          // Si estamos en el inicio y presionamos atrás, cerramos la app
          App.exitApp();
        }
      });
      return backButtonHandler;
    };

    const handlerPromise = setupBackButton();

    return () => {
      handlerPromise.then(handler => handler.remove());
    };
  }, [pathname]); // Se reinicia si cambia la ruta para estar siempre alerta

  return <SessionProvider>{children}</SessionProvider>;
}

