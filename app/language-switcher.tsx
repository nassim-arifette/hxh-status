"use client";

import { ChevronDown, Languages } from "lucide-react";

import {
  getLocalePath,
  localeOptions,
  localePreferenceKey,
  type Locale,
} from "@/lib/i18n";

export default function LanguageSwitcher({
  label,
  locale,
}: {
  label: string;
  locale: Locale;
}) {
  const isPublishedLocale = localeOptions.some(
    (option) => option.locale === locale,
  );

  if (!isPublishedLocale) return null;

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;

    try {
      window.localStorage.setItem(localePreferenceKey, nextLocale);
    } catch {
      // Navigation still works when storage is disabled by the browser.
    }

    document.documentElement.lang = nextLocale;
    const nextUrl = new URL(getLocalePath(nextLocale), window.location.origin);
    nextUrl.search = window.location.search;
    nextUrl.hash = window.location.hash;
    window.location.assign(nextUrl);
  }

  return (
    <label className="language-picker">
      <span className="sr-only">{label}</span>
      <Languages className="language-picker-icon" size={15} aria-hidden="true" />
      <select
        aria-label={label}
        value={locale}
        onChange={(event) => changeLocale(event.currentTarget.value as Locale)}
      >
        {localeOptions.map((option) => (
          <option key={option.locale} value={option.locale}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="language-picker-chevron"
        size={14}
        aria-hidden="true"
      />
    </label>
  );
}
