import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaInstaller } from "@/components/pwa/PwaInstaller";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export const metadata: Metadata = {
  title: "DAMEC - Plataforma de Emergencias Climáticas (FEN Perú)",
  description: "Monitoreo geoespacial en tiempo real, alertas oficiales de SENAMHI/SUTRAN/INDECI y reporte ciudadano offline frente al Fenómeno El Niño.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DAMEC"
  },
  icons: {
    icon: "/icons/favicon-32x32.png",
    apple: "/icons/apple-touch-icon.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-PE"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-900 text-slate-900 select-none sm:select-auto">
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
