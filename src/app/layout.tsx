import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VANTSNET — Estadísticas de Valorant",
  description: "Prototipo de red de estadísticas gaming: estadísticas de Valorant con la API oficial de Riot Games. Perfiles, historial de partidas y scoreboards.",
  keywords: ["VANTSNET", "Valorant", "estadísticas", "stats", "Riot API", "gaming"],
  authors: [{ name: "VANTSNET" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "VANTSNET",
    description: "Estadísticas de Valorant con la API oficial de Riot Games",
    siteName: "VANTSNET",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
