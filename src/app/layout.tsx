import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { SkipToContent } from "@/components/ui/SkipToContent";
import { TopLoader } from "@/components/ui/TopLoader";
import { AnimatedPageWrapper } from "@/components/ui/PageTransition";
import { Providers } from "@/app/providers";
import { NavBar } from "@/components/layout/NavBar";
import { FooterWithPrivacy } from "@/components/layout/FooterWithPrivacy";
import { SupportButton } from "@/components/SupportButton";
import { NotificationBubble } from "@/components/NotificationBubble";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Mercadito Ocoyoacac",
    template: "%s | Mercadito Ocoyoacac",
  },
  description:
    "Marketplace multi-vendedor para negocios locales en Ocoyoacac, Edomex. Compra productos locales, apoya a tu comunidad.",
  keywords: ["mercado", "Ocoyoacac", "compras locales", "marketplace", "Edomex", "tiendas locales"],
  authors: [{ name: "Mercadito Ocoyoacac" }],
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://mercadito-ocoyoacac.vercel.app",
    siteName: "Mercadito Ocoyoacac",
    title: "Mercadito Ocoyoacac — Compra local, apoya tu comunidad",
    description:
      "Marketplace multi-vendedor para negocios locales en Ocoyoacac, Edomex.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mercadito Ocoyoacac",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mercadito Ocoyoacac",
    description: "Marketplace multi-vendedor para negocios locales en Ocoyoacac, Edomex.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Mercadito",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem("darkMode"),d=s!==null?s==="true":window.matchMedia("(prefers-color-scheme:dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()` }} />
        <SkipToContent />
        <TopLoader />
        <Providers>
          <ConfirmProvider>
            <NavBar />
            <div id="main-content" className="flex flex-1 flex-col pt-16"><AnimatedPageWrapper>{children}</AnimatedPageWrapper></div>
            <FooterWithPrivacy />
            <Toaster position="top-right" richColors closeButton />
            <SupportButton />
            <NotificationBubble />
          </ConfirmProvider>
        </Providers>
      </body>
    </html>
  );
}
