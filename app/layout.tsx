import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Archivo } from "next/font/google";
import { createLocaleMetadata } from "@/lib/metadata";
import englishMessages from "@/messages/en.json";
import { LOCAL_DATE_SCRIPT } from "./local-date";
import { THEME_SCRIPT } from "./theme";
import "./globals.css";
import "./site.css";

// The tracker's display face. Its width axis gives the condensed numerals the
// home page sets large; body copy uses the same family at normal width.
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hxhstatus.com"),
  ...createLocaleMetadata("en", englishMessages),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // One root layout serves every route, so lang and dir cannot vary here.
  // scripts/set-html-lang.mjs stamps the right pair onto each exported page
  // after the build. Language negotiation for "/" happens at the Worker, in
  // worker/locale-redirect.mjs, so no script runs before paint any more.
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${GeistSans.variable} ${GeistMono.variable} ${archivo.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a stored light/dark choice before the first paint. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        {/* One rewrite pass for every date in the document, placed last so the
            elements exist. Its bytes are identical on every page, which is what
            lets scripts/inject-csp-hashes.mjs allow it by hash. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: LOCAL_DATE_SCRIPT }}
        />
      </body>
    </html>
  );
}
