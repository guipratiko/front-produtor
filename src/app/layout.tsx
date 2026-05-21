import type { Metadata, Viewport } from "next";
import { ProducerProvider } from "@/context/ProducerContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uai Tickets — Produtor",
  description: "Painel do produtor do evento",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2d1045",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <ProducerProvider>{children}</ProducerProvider>
      </body>
    </html>
  );
}
