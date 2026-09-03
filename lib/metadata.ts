import "server-only";

import type { Metadata } from "next";

import { statusDataRevision } from "@/app/data/status";

import {
  getLocaleUrl,
  getOpenGraphLocale,
  isPublicLocale,
  languageAlternates,
  publicLocales,
  type Locale,
  type Messages,
} from "./i18n";

export function createLocaleMetadata(
  locale: Locale,
  messages: Messages,
): Metadata {
  const url = getLocaleUrl(locale);
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

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    alternates: {
      canonical: url,
      languages: published ? languageAlternates : undefined,
    },
    openGraph: {
      title: messages.metadata.title,
      description: messages.metadata.description,
      url,
      siteName: messages.metadata.siteName,
      locale: getOpenGraphLocale(locale),
      alternateLocale,
      type: "website",
      images: [{ ...image, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title: messages.metadata.title,
      description: messages.metadata.description,
      images: [image],
    },
    robots: published ? undefined : { index: false, follow: false },
  };
}
