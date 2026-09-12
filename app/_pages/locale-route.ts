import { notFound } from "next/navigation";

import { getMessages } from "@/lib/dictionaries";
import { isLocale, isPublicLocale, publicLocales, type Locale } from "@/lib/i18n";

// Shared by every /[locale]/… route. English is served from the bare path, so
// it is never a value of the [locale] segment; with dynamicParams disabled that
// makes /en a 404 rather than a second copy of the home page competing with /.
export function localeParams() {
  return publicLocales
    .filter((locale) => locale !== "en")
    .map((locale) => ({ locale }));
}

export function resolveLocale(value: string): Locale {
  if (!isLocale(value) || !isPublicLocale(value) || value === "en") notFound();
  return value;
}

export function localeMessages(value: string) {
  return getMessages(resolveLocale(value));
}
