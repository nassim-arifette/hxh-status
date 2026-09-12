import localeConfig from "../lib/locales.json" with { type: "json" };

export const LOCALE_COOKIE = "hxhstatus_locale";

const PUBLIC_LOCALES = Object.entries(localeConfig.locales)
  .filter(([, settings]) => settings.published)
  .map(([locale]) => locale);

const DEFAULT_LOCALE = "en";

// A reader who picked a language in the header carries it in a cookie, because
// the Worker cannot read the localStorage copy the switcher also writes.
export function cookieLocale(request) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== LOCALE_COOKIE) continue;
    const value = rest.join("=").trim().toLowerCase();
    return PUBLIC_LOCALES.includes(value) ? value : null;
  }
  return null;
}

// Only a choice the reader made themselves moves them off "/".
//
// Accept-Language used to decide this too, and it is the wrong signal for a
// site whose pages are indexed: a crawler that sends a language header is
// bounced to a translation of the page it asked for, and a reader who wants
// the English URL cannot reach it by typing the domain. The language menu is
// seven real links in the header, so choosing a language costs one click and
// is then remembered here.
export function negotiateLocale(request) {
  return cookieLocale(request) ?? DEFAULT_LOCALE;
}

// Only "/" is negotiated. Every other path either names its locale or is an
// asset, and redirecting those would break deep links and the capture routes.
export function localeRedirect(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const url = new URL(request.url);
  if (url.pathname !== "/") return null;

  const locale = negotiateLocale(request);
  if (locale === DEFAULT_LOCALE) return null;

  const target = new URL(`/${locale}`, url);
  target.search = url.search;

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${target.pathname}${target.search}`,
      // The response depends on the cookie, so an edge or browser cache must
      // not hand one reader's language to the next.
      Vary: "Cookie",
      "Cache-Control": "no-store",
    },
  });
}
