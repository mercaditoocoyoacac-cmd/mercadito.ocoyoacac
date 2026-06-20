import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { SkipToContent } from "@/components/ui/SkipToContent";
import { TopLoader } from "@/components/ui/TopLoader";
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
  title: "Mercadito Ocoyoacac",
  description:
    "Marketplace multi-vendedor para negocios locales en Ocoyoacac, Edomex.",
  icons: {
    icon: "/Logo MO.png",
    apple: "/Logo MO.png",
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
            <div id="main-content" className="flex flex-1 flex-col">{children}</div>
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
