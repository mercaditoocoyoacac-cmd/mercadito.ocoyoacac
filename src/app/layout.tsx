import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { NavBar } from "@/components/NavBar";
import { FooterWithPrivacy } from "@/components/FooterWithPrivacy";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mercadito Ocoyoacac",
  description:
    "Marketplace multi-vendedor para negocios locales en Ocoyoacac, Edomex.",
  icons: {
    icon: "/Logo MO.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <NavBar />
          <div className="flex flex-1 flex-col">{children}</div>
          <FooterWithPrivacy />
        </Providers>
      </body>
    </html>
  );
}
