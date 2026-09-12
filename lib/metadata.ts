import "server-only";

import type { Metadata } from "next";

import { statusDataRevision } from "@/app/data/status";
import { buildHomeDescription, buildHomeTitle } from "@/app/data/summary";

import {
  getLanguageAlternates,
  getOpenGraphLocale,
  isPublicLocale,
  publicLocales,
  type Locale,
  type Messages,
} from "./i18n";
import { localeUrl } from "./routes";

type PageMetadataOptions = {
  locale: Locale;
  messages: Messages;
  // Locale-independent path, "/" for the home page and "/chapter/421" for a
  // sub-page. Every language of one page shares it, which is what lets the
  // hreflang cluster below be generated rather than hand-written.
  path?: string;
  title?: string;
  description?: string;
};

export function createPageMetadata({
  locale,
  messages,
  path = "/",
  title,
  description,
}: PageMetadataOptions): Metadata {
  const url = localeUrl(path, locale);
  const image = {
    url: `/opengraph-image?v=${statusDataRevision}`,
    width: 1200,
    height: 630,
    alt: messages.metadata.imageAlt,
  };
  const alternateLocale = publicLocales
    .filter((candidate) => candidate !== locale)
    .map(getOpenGraphLocale);
  const published = isPublicLocale(locale);
  const pageTitle = title ?? messages.metadata.title;
  const pageDescription = description ?? messages.metadata.description;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: url,
      languages: published ? getLanguageAlternates(path) : undefined,
      types: {
        "application/atom+xml": [
          {
            url: locale === "en" ? "/feed.xml" : `/${locale}/feed.xml`,
            title: `${messages.metadata.siteName} (${locale.toUpperCase()})`,
          },
        ],
      },
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url,
      siteName: messages.metadata.siteName,
      locale: getOpenGraphLocale(locale),
      alternateLocale,
      type: "website",
      images: [{ ...image, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [image],
    },
    robots: published ? undefined : { index: false, follow: false },
  };
}

// The home page leads with the question readers actually type, answered from
// the tracker data, so the title and description move whenever the data does.
export function createLocaleMetadata(
  locale: Locale,
  messages: Messages,
): Metadata {
  return createPageMetadata({
    locale,
    messages,
    title: buildHomeTitle(locale, messages),
    description: buildHomeDescription(locale, messages),
  });
}
