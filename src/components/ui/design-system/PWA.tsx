"use client";

import { useEffect } from "react";

export function PWA() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope);

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // Show update notification
                  if (confirm("Nueva versión disponible. ¿Actualizar?")) {
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log("SW registration failed:", error);
        });

      // Listen for controller change (update ready)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }

    // Install prompt
    let deferredPrompt: any;
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show custom install button after 30 seconds
      setTimeout(() => {
        if (deferredPrompt && !localStorage.getItem("pwa-install-dismissed")) {
          showInstallPrompt(deferredPrompt);
        }
      }, 30000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    function showInstallPrompt(promptEvent: any) {
      const banner = document.createElement("div");
      banner.id = "pwa-install-banner";
      banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        max-width: 400px;
        margin: 0 auto;
        background: white;
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
          <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--accent); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 14px;">Instalar Mercadito</div>
            <div style="font-size: 12px; color: #6b7280;">Acceso rápido desde tu pantalla de inicio</div>
          </div>
          <button id="pwa-install-btn" style="background: var(--accent); color: white; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 600; font-size: 13px;">Instalar</button>
          <button id="pwa-dismiss-btn" style="background: none; border: none; color: #9ca3af; font-size: 18px; line-height: 1;">×</button>
        </div>
      `;

      document.body.appendChild(banner);

      document.getElementById("pwa-install-btn")?.addEventListener("click", async () => {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          console.log("PWA installed");
        }
        banner.remove();
        deferredPrompt = null;
      });

      document.getElementById("pwa-dismiss-btn")?.addEventListener("click", () => {
        banner.remove();
        localStorage.setItem("pwa-install-dismissed", "true");
        deferredPrompt = null;
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}