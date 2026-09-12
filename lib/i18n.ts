import type englishMessages from "@/messages/en.json";
import localeConfig from "./locales.json";
import { localePath, localeUrl, siteUrl } from "./routes";

export type Locale = keyof typeof localeConfig.locales;
export type Messages = typeof englishMessages;
export type MessageValues = Record<string, number | string>;

type OfficialReader = {
  href: string;
  label: string;
};

type OfficialReaderConfig = OfficialReader & {
  chapterUrls?: Record<string, string>;
};

type LocaleSettings = {
  dir: "ltr" | "rtl";
  label: string;
  openGraphLocale: string;
  published: boolean;
  officialReaders?: OfficialReaderConfig[];
};

const localeSettings = localeConfig.locales as Record<Locale, LocaleSettings>;

export const locales = Object.keys(localeConfig.locales) as Locale[];
export const publicLocales = locales.filter(
  (locale) => localeSettings[locale].published,
);
export const localePreferenceKey = "hxhstatus.locale";
// Mirrors localePreferenceKey for the Worker, which negotiates "/" and has no
// access to localStorage. worker/locale-redirect.mjs reads this name.
export const localeCookieName = "hxhstatus_locale";
export { siteUrl };

export function getLocalePath(locale: Locale) {
  return localePath("/", locale);
}

export function getLocaleUrl(locale: Locale) {
  return localeUrl("/", locale);
}

export function getLocaleDirection(locale: Locale) {
  return localeSettings[locale].dir;
}

export function getOpenGraphLocale(locale: Locale) {
  return localeSettings[locale].openGraphLocale;
}

export function isPublicLocale(locale: Locale) {
  return localeSettings[locale].published;
}

// The endonym, so "Français" reads the same whichever language the page is in.
export function getLocaleLabel(locale: Locale) {
  return localeSettings[locale].label;
}

// Every published language, plus the x-default that points at English. Google
// only trusts an hreflang cluster when each member names every other member and
// itself, so the same map is emitted on every locale of a given page.
export function getLanguageAlternates(path = "/"): Record<string, string> {
  return Object.fromEntries([
    ["x-default", localeUrl(path, "en")] as const,
    ...publicLocales.map(
      (locale) => [locale, localeUrl(path, locale)] as const,
    ),
  ]);
}

export const languageAlternates = getLanguageAlternates();

// The language menu links to the same page in each language, so a reader who
// switches language on /chapter/421 lands on /fr/chapter/421 rather than the
// home page. The links are real anchors, which is also what a crawler follows.
export function getLocaleOptions(path = "/") {
  return publicLocales.map((locale) => ({
    label: localeSettings[locale].label,
    locale,
    path: localePath(path, locale),
  }));
}

export const localeOptions = getLocaleOptions();

export function isLocale(value: string): value is Locale {
  return Object.prototype.hasOwnProperty.call(localeConfig.locales, value);
}

export function getOfficialReaders(
  locale: Locale,
  chapter?: number,
): readonly OfficialReader[] {
  const settings = localeSettings[locale];
  const readers = (settings.officialReaders ??
    localeConfig.defaultOfficialReaders) as OfficialReaderConfig[];
  const chapterKey = chapter?.toString();

  return readers.map(({ chapterUrls, ...reader }) => ({
    ...reader,
    href:
      (chapterKey ? chapterUrls?.[chapterKey] : undefined) ?? reader.href,
  }));
}

export function formatMessage(
  template: string,
  values: MessageValues = {},
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (placeholder, key) => {
    return Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : placeholder;
  });
}
