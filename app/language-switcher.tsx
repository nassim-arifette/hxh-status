"use client";

import { ChevronDown, Languages } from "lucide-react";

import {
  getLocaleOptions,
  localeCookieName,
  localePreferenceKey,
  type Locale,
} from "@/lib/i18n";

// Every language is a real <a href> inside a <details> menu: it opens, and it
// can be followed, with no JavaScript at all. That matters twice over — a
// crawler discovers the other six languages of the page it is on, and the
// content pages ship no script yet still switch language.
//
// The click handler is an enhancement on top, not the mechanism: it remembers
// the choice so the Worker can honour it the next time the bare domain is
// requested. Without it the link still works, the preference is simply not
// stored.
function rememberLocale(locale: Locale) {
  try {
    window.localStorage.setItem(localePreferenceKey, locale);
  } catch {
    // Navigation still works when storage is disabled by the browser.
  }

  document.cookie =
    `${localeCookieName}=${locale};path=/;max-age=31536000;samesite=lax`;
}

export default function LanguageSwitcher({
  label,
  locale,
  path = "/",
}: {
  label: string;
  locale: Locale;
  path?: string;
}) {
  const options = getLocaleOptions(path);
  const current = options.find((option) => option.locale === locale);

  if (!current) return null;

  return (
    <details className="language-picker">
      <summary aria-label={label}>
        <Languages
          className="language-picker-icon"
          size={15}
          aria-hidden="true"
        />
        <span className="language-picker-current">{current.label}</span>
        <ChevronDown
          className="language-picker-chevron"
          size={14}
          aria-hidden="true"
        />
      </summary>
      <ul className="language-picker-menu">
        {options.map((option) => (
          <li key={option.locale}>
            <a
              aria-current={option.locale === locale ? "true" : undefined}
              hrefLang={option.locale}
              href={option.path}
              lang={option.locale}
              onClick={() => rememberLocale(option.locale)}
            >
              {option.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
