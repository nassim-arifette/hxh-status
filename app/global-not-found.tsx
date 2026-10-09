import type { Metadata } from "next";
import { Archivo } from "next/font/google";

import englishMessages from "@/messages/en.json";
import { localePath } from "@/lib/routes";
import { nextChapter } from "./data/status";
import { SiteNavigation } from "./site-navigation";
import { THEME_SCRIPT } from "./theme";
import ThemeToggle from "./theme-toggle";
import "./globals.css";

// Served for every unmatched path, in every language, so it stays in English
// and points to the pages people most often arrive looking for.
//
// A global 404 rather than app/not-found.tsx: a root not-found is serialized
// into every page's payload, which made each page heavier and pushed the
// share-capture pages' CSP past Cloudflare's 2,000-character limit. This one is
// rendered on its own, so it brings its own document, styles, font and theme
// script.

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Page not found | HxH Status",
  robots: { index: false },
};

export default function GlobalNotFound() {
  const messages = englishMessages;
  const links = [
    { href: "/", label: "Is Hunter x Hunter on hiatus?" },
    { href: `/chapter/${nextChapter.chapter}`, label: `Chapter ${nextChapter.chapter} release date` },
    { href: "/updates", label: "Togashi’s latest updates" },
    { href: "/where-to-read", label: "Where to read Hunter x Hunter" },
  ];

  return (
    <html lang="en" dir="ltr" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body>
        <main className="site-shell content-shell" id="top">
          <div className="page-frame">
            <header className="site-header">
              <a className="wordmark" href={localePath("/", "en")}>
                <span className="wordmark-hxh">
                  H<span className="wordmark-times">&times;</span>H
                </span>
                {" "}
                <span className="wordmark-status">Status</span>
              </a>
              <SiteNavigation locale="en" messages={messages} path="/404" />
              <div className="header-meta">
                <ThemeToggle label={messages.header.darkMode} />
              </div>
            </header>

            <article className="content-page">
              <header className="content-page-head">
                <p className="eyebrow">404</p>
                <h1>This page doesn’t exist</h1>
                <p className="page-lede">
                  The link may be old or mistyped. These are the pages most readers
                  are looking for.
                </p>
              </header>
              <ul className="not-found-links">
                {links.map((link) => (
                  <li key={link.href}>
                    <a href={localePath(link.href, "en")}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </main>
      </body>
    </html>
  );
}
