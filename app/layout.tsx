import type { Metadata } from "next";
import Script from "next/script";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import {
  getLocaleDirection,
  locales,
  localePreferenceKey,
  publicLocales,
} from "@/lib/i18n";
import { createLocaleMetadata } from "@/lib/metadata";
import englishMessages from "@/messages/en.json";
import "./globals.css";

const localeDirections = Object.fromEntries(
  locales.map((locale) => [locale, getLocaleDirection(locale)]),
);
const localeDetectionScript = `(() => {
  const known = ${JSON.stringify(locales)};
  const supported = ${JSON.stringify(publicLocales)};
  const directions = ${JSON.stringify(localeDirections)};
  const storageKey = ${JSON.stringify(localePreferenceKey)};
  const segments = location.pathname.split("/").filter(Boolean);
  const pathLocale = (
    segments[0] === "capture" ? segments[1] : segments[0]
  )?.toLowerCase();

  if (known.includes(pathLocale)) {
    document.documentElement.lang = pathLocale;
    document.documentElement.dir = directions[pathLocale] ?? "ltr";
    return;
  }

  if (location.pathname !== "/") return;

  let preference = null;

  try {
    preference = localStorage.getItem(storageKey);
  } catch {}

  if (!supported.includes(preference)) {
    const browserLanguages = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];

    preference = browserLanguages
      .map((language) => language.toLowerCase().split(/[-_]/)[0])
      .find((language) => supported.includes(language)) ?? null;
  }

  if (preference && preference !== "en") {
    location.replace(
      "/" + preference + location.search + location.hash,
    );
  }
})();`;

export const metadata: Metadata = {
  metadataBase: new URL("https://hxhstatus.com"),
  ...createLocaleMetadata("en", englishMessages),
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
    <html
      lang="en"
      dir="ltr"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {children}
        <Script id="locale-detection" strategy="beforeInteractive">
          {localeDetectionScript}
        </Script>
      </body>
    </html>
  );
}
