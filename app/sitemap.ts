import type { MetadataRoute } from "next";

import {
  getLocaleUrl,
  languageAlternates,
  publicLocales,
} from "@/lib/i18n";
import { lastUpdated } from "./data/status";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicLocales.map((locale) => ({
    url: getLocaleUrl(locale),
    lastModified: new Date(`${lastUpdated}T00:00:00.000Z`),
    alternates: {
      languages: languageAlternates,
    },
  }));
}
