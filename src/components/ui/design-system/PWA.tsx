"use client";

import { useEffect } from "react";

export function PWA() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => {});

    const handleControllerChange = () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    let deferredPrompt: any = null;
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event;
      window.setTimeout(() => {
        if (deferredPrompt && !localStorage.getItem("pwa-install-dismissed")) {
          showInstallPrompt(deferredPrompt);
        }
      }, 30000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    function showInstallPrompt(promptEvent: any) {
      if (document.getElementById("pwa-install-banner")) return;

      const banner = document.createElement("div");
      banner.id = "pwa-install-banner";
      banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        max-width: 400px;
        margin: 0 auto;
        background: var(--card-bg);
        color: var(--foreground);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        padding: 16px;
        z-index: 10000;
        animation: slideUp 0.3s ease-out;
      `;
      banner.innerHTML = `
        <style>
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        </style>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--accent); display: flex; align-items: center; justify-content: center; color: var(--on-accent);">
            <svg aria-hidden="true" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 14px;">Instalar Mercadito</div>
            <div style="font-size: 12px; color: var(--muted);">Acceso rápido desde tu pantalla de inicio</div>
          </div>
          <button id="pwa-install-btn" style="background: var(--accent); color: var(--on-accent); border: 0; border-radius: 8px; padding: 8px 16px; font-weight: 600; font-size: 13px; min-height: 44px;">Instalar</button>
          <button id="pwa-dismiss-btn" style="background: none; border: 0; color: var(--muted); font-size: 18px; line-height: 1; min-height: 44px;" aria-label="Cerrar">×</button>
        </div>
      `;

      document.body.appendChild(banner);

      document.getElementById("pwa-install-btn")?.addEventListener("click", async () => {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          deferredPrompt = null;
        }
        banner.remove();
      });

      document.getElementById("pwa-dismiss-btn")?.addEventListener("click", () => {
        banner.remove();
        localStorage.setItem("pwa-install-dismissed", "true");
        deferredPrompt = null;
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
