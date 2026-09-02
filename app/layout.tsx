import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import englishMessages from "@/messages/en.json";
import "./globals.css";

const { title, description } = englishMessages.metadata;

export const metadata: Metadata = {
  metadataBase: new URL("https://hxhstatus.com"),
  title,
  description,
  alternates: {
    canonical: "https://hxhstatus.com",
  },
  openGraph: {
    title,
    description,
    url: "https://hxhstatus.com",
    siteName: englishMessages.metadata.siteName,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
