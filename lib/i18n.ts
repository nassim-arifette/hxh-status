import type englishMessages from "@/messages/en.json";
import localeConfig from "./locales.json";

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
export const siteUrl = "https://hxhstatus.com";

export function getLocalePath(locale: Locale) {
  return locale === "en" ? "/" : `/${locale}`;
}

export function getLocaleUrl(locale: Locale) {
  return `${siteUrl}${getLocalePath(locale)}`;
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

export const languageAlternates: Record<string, string> = Object.fromEntries([
  ["x-default", siteUrl] as const,
  ...publicLocales.map(
    (locale) => [locale, getLocaleUrl(locale)] as const,
  ),
]);

export const localeOptions = publicLocales.map((locale) => ({
  label: localeSettings[locale].label,
  locale,
  path: getLocalePath(locale),
}));

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
