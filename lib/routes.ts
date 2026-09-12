// The site's URL shapes, in one place. Build scripts import this module
// directly (Node strips the types), so it must stay free of path aliases and
// of anything that only resolves through the bundler.

export const siteUrl = "https://hxhstatus.com";

export const defaultLocale = "en";

// A page whose whole job is to answer one question with data already in the
// repository. Every one of them is served in every published language, and the
// English copy sits at the root while the others take a locale prefix.
export const CONTENT_PAGES = [
  "hiatus",
  "statistics",
  "updates",
  "where-to-read",
  "about",
  "api",
] as const;

export type ContentPage = (typeof CONTENT_PAGES)[number];

// Sections whose members are generated from data, one page per record. They
// are listed apart from CONTENT_PAGES because the sitemap has to expand them
// and the build scripts group them by prefix rather than by exact route.
export const CONTENT_SECTIONS = ["chapter", "updates", "arcs"] as const;

export const ARC_PAGES = ["succession-war"] as const;

export function contentPagePath(page: ContentPage) {
  return `/${page}`;
}

export function chapterPath(chapter: number) {
  return `/chapter/${chapter}`;
}

export function updatePath(postId: string) {
  return `/updates/${postId}`;
}

export function arcPath(arc: (typeof ARC_PAGES)[number]) {
  return `/arcs/${arc}`;
}

// "/" and "/fr", "/hiatus" and "/fr/hiatus": English keeps the bare path so the
// canonical URL of the most-linked language never changes.
export function localePath(path: string, locale: string) {
  const normalized = path === "/" ? "" : path;
  return locale === defaultLocale
    ? normalized || "/"
    : `/${locale}${normalized}`;
}

export function localeUrl(path: string, locale: string) {
  return `${siteUrl}${localePath(path, locale)}`;
}

// A route that is pure content: no interactive component, and therefore no
// reason to ship the framework runtime with it. scripts/strip-page-scripts.mjs
// reads this to decide which exported pages lose their JavaScript, and
// scripts/inject-csp-hashes.mjs groups them into shared header rules.
export function isContentRoute(route: string, locales: readonly string[]) {
  const segments = route.split("/");
  const path =
    segments.length > 1 && locales.includes(segments[1])
      ? `/${segments.slice(2).join("/")}`
      : route;

  return (
    CONTENT_PAGES.some((page) => path === `/${page}`) ||
    CONTENT_SECTIONS.some((section) => path.startsWith(`/${section}/`))
  );
}
