"use client";

import { useEffect, useState } from "react";

export function MobileAppBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const android = /android/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;

    setIsAndroid(android);
    setIsStandalone(standalone);

    if (android && !standalone && !localStorage.getItem("mobile-app-banner-dismissed") && !localStorage.getItem("mobile-app-banner-continue-web")) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!showBanner || !isAndroid || isStandalone) return null;

  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.mercadito.ocoyoacac.app.compras";

  const handleDownload = () => {
    window.open(playStoreUrl, "_blank", "noopener,noreferrer");
    setShowBanner(false);
    localStorage.setItem("mobile-app-banner-dismissed", "true");
  };

  const handleContinueWeb = () => {
    setShowBanner(false);
    localStorage.setItem("mobile-app-banner-continue-web", "true");
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("mobile-app-banner-dismissed", "true");
  };

  return (
    <div
      id="mobile-app-banner"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "white",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        padding: "16px 16px 24px",
        zIndex: 10000,
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 480px) {
          .banner-content { padding: 0 4px; }
        }
      `}</style>

      <div className="banner-content" style={{ maxWidth: 400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "#f59e0b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            flexShrink: 0
          }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>¿Quieres la app de Mercadito?</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              Acceso más rápido, notificaciones de ofertas y mejor experiencia
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
              cursor: "pointer"
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              background: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "12px 16px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.53 13.76c-1.13.24-1.77.79-2.45 1.14l-1.29-1.5c.8-.4 1.47-.97 2.01-1.14.71-.23 1.3-.46 1.8-.46.95 0 1.83.48 2.08 1.32l-1.44 1.66zm-2.33 2.85c-.2 2.14-.24 2.76-3.1 2.76-2.43 0-3.13-1.44-3.3-2.44h-.02c0 0-.02-2.68 1.17-4.03.07-.08 3.29-4.11 6.83-4.33v1.37c-1.7.23-3.05.92-3.42 1.67l1.02 1.07c.53-.84 1.77-1.29 2.96-1.29 2.83 0 3.68 2.33 3.68 2.94 0 1.3-.38 2.13-2.22 2.13-1.78 0-2.33-1.05-2.41-1.3l-1.45.38c-.05.42-.38 1.17-1.23 1.17-.84 0-1.14-.46-1.33-.95l-.12-.29-.35-.09-.14.07h-.02c-2 1.42-3.12 3.57-3.12 4.69zm-4.29-12.23h8.08c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5H6.9c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5zm0 4.18h8.08c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5H6.9c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5z" />
            </svg>
            Descargar en Play Store
          </button>
          <button
            onClick={handleContinueWeb}
            style={{
              flex: 1,
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: 10,
              padding: "12px 16px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Continuar en web
          </button>
        </div>
      </div>
    </div>
  );
}