import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#FF6BBF",
};

export const metadata: Metadata = {
  title: "Glazed & Sipped — Premium Donuts & Beverages",
  description: "Handcrafted donuts and signature beverages, made fresh daily with love.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Glazed & Sipped",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
