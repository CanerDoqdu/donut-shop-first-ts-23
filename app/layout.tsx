import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#FF6BBF",
};

export const metadata: Metadata = {
  title: "Glazed & Sipped — Premium Donuts & Beverages",
  description: "Handcrafted donuts and signature beverages, made fresh daily with love. Order online for delivery or visit our stores.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://glazedandsipped.com"),
  openGraph: {
    title: "Glazed & Sipped — Premium Donuts & Beverages",
    description: "Handcrafted donuts and signature beverages, made fresh daily with love.",
    url: "https://glazedandsipped.com",
    siteName: "Glazed & Sipped",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glazed & Sipped — Premium Donuts & Beverages",
    description: "Handcrafted donuts and signature beverages, made fresh daily with love.",
  },
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
