import type { Locale } from "@/lib/i18n";

// Dates are rendered on the server in a fixed timezone and rewritten in the
// visitor's once the document arrives. That rewrite used to be an inline
// <script> next to every date, each carrying its own serialised Intl options
// and a React-generated element id, so no two were alike. One script per
// document can be allowed by a CSP hash; a script per date cannot be bounded.

export const compactDateOptions = {
  month: "short",
  day: "numeric",
} satisfies Intl.DateTimeFormatOptions;

export const timeOptions = {
  hour: "numeric",
  minute: "2-digit",
} satisfies Intl.DateTimeFormatOptions;

// Arabic separates with its own comma; Japanese and Chinese use none. Anything
// else takes the default. The script below is built from this same table, so
// the server and the browser cannot disagree.
const SEPARATORS: Partial<Record<Locale, string>> = {
  ar: "، ",
  ja: " ",
  zh: " ",
};
const DEFAULT_SEPARATOR = ", ";

export function localDateSeparator(locale: Locale): string {
  return SEPARATORS[locale] ?? DEFAULT_SEPARATOR;
}

// The locale comes from <html lang>, which scripts/set-html-lang.mjs stamps
// per page, so a date only has to carry its own timestamp. Elements React adds
// later — a tooltip, the detail sheet — are already in the visitor's timezone
// from the client render, so this only has to catch what came down in the HTML.
export const LOCAL_DATE_SCRIPT =
  `(function(){var t=${JSON.stringify(timeOptions)},f=${JSON.stringify(compactDateOptions)},` +
  `s=${JSON.stringify(SEPARATORS)},l=document.documentElement.lang||"en";` +
  `var j=s[l]||${JSON.stringify(DEFAULT_SEPARATOR)};` +
  `var n=document.querySelectorAll("time[data-local-date]");` +
  `for(var i=0;i<n.length;i++){var e=n[i],v=new Date(e.getAttribute("data-local-date"));` +
  `if(isNaN(v))continue;var p=[];` +
  `if(e.hasAttribute("data-show-time"))p.push(new Intl.DateTimeFormat(l,t).format(v));` +
  `p.push(new Intl.DateTimeFormat(l,f).format(v));e.textContent=p.join(j)}})();`;
