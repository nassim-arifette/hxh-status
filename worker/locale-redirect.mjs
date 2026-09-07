import localeConfig from "../lib/locales.json" with { type: "json" };

export const LOCALE_COOKIE = "hxhstatus_locale";

const PUBLIC_LOCALES = Object.entries(localeConfig.locales)
  .filter(([, settings]) => settings.published)
  .map(([locale]) => locale);

const DEFAULT_LOCALE = "en";

// A reader who picked a language in the header carries it in a cookie, because
// the Worker cannot read the localStorage copy the switcher also writes.
function cookieLocale(request) {
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

// Accept-Language, by descending q. "fr-CA" counts as French; a tag we do not
// publish is skipped rather than ending the search, so "sv, fr;q=0.8" is French.
export function parseAcceptLanguage(header) {
  if (typeof header !== "string" || header === "") return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((param) => /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(param))
        .find(Boolean);
      const quality = q ? Number.parseFloat(q[1]) : 1;
      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry) => entry.tag !== "" && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag);
}

export function negotiateLocale(request) {
  const chosen = cookieLocale(request);
  if (chosen) return chosen;

  for (const tag of parseAcceptLanguage(request.headers.get("Accept-Language"))) {
    if (tag === "*") return DEFAULT_LOCALE;
    const base = tag.split("-")[0];
    if (PUBLIC_LOCALES.includes(base)) return base;
  }

  // No header, or nothing we publish: English is what "/" already serves, and
  // it is also what a crawler that sends no preference should be given.
  return DEFAULT_LOCALE;
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
      // The response depends on both, so an edge or browser cache must not
      // hand one reader's language to the next.
      Vary: "Accept-Language, Cookie",
      "Cache-Control": "no-store",
    },
  });
}
