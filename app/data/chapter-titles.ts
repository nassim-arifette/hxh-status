import type { Locale } from "@/lib/i18n";
import ar from "./chapter-titles/ar.json";
import en from "./chapter-titles/en.json";
import es from "./chapter-titles/es.json";
import fr from "./chapter-titles/fr.json";
import ja from "./chapter-titles/ja.json";
import pt from "./chapter-titles/pt.json";
import zh from "./chapter-titles/zh.json";

// Every locale's titles, which is why nothing under "use client" may import
// this module: it would ship all seven to every reader. Server components call
// getChapterTitles once and pass the result down. Volume numbers and the two
// label tables are small enough to import directly, and live in chapter-meta.
export type ChapterTitles = Record<string, string>;

const TITLES: Record<Locale, ChapterTitles> = { en, fr, ja, es, pt, zh, ar };

// The Japanese titles are the source every translation is made from, and they
// are also what a Japanese reader sees, so ja.json serves both roles.
const ORIGINALS: ChapterTitles = ja;

// The publication-history chart labels some cells with a string, so both forms
// are accepted and reduced to the key the title files use.
function titleKey(chapter: number | string | undefined): string | undefined {
  if (chapter === undefined) return undefined;
  const num = typeof chapter === "string" ? Number.parseInt(chapter, 10) : chapter;
  return Number.isNaN(num) ? undefined : String(num);
}

export function getChapterTitle(
  chapter: number | string | undefined,
  locale: Locale = "en",
): string | undefined {
  const key = titleKey(chapter);
  if (key === undefined) return undefined;
  return TITLES[locale]?.[key] ?? TITLES.en[key];
}

export function getChapterOriginalTitle(
  chapter: number | string | undefined,
): string | undefined {
  const key = titleKey(chapter);
  return key === undefined ? undefined : ORIGINALS[key];
}

// One locale's titles, with English filled in wherever that locale is short, so
// a client component can look a title up without a fallback chain of its own.
export function getChapterTitles(locale: Locale): ChapterTitles {
  const localeTitles = TITLES[locale] ?? {};
  if (locale === "en") return { ...TITLES.en };
  return { ...TITLES.en, ...localeTitles };
}

// The same, restricted to the chapters a component actually renders. The
// tracker shows about thirty, so shipping all 421 would be waste.
export function getChapterTitlesFor(
  locale: Locale,
  chapters: readonly (number | string)[],
): ChapterTitles {
  const all = getChapterTitles(locale);
  const picked: ChapterTitles = {};
  for (const chapter of chapters) {
    const key = titleKey(chapter);
    if (key !== undefined && all[key]) picked[key] = all[key];
  }
  return picked;
}

export const chapterTitleLocales = Object.keys(TITLES) as Locale[];

export function getTitleCoverage(locale: Locale): {
  translated: number;
  total: number;
} {
  return {
    translated: Object.keys(TITLES[locale] ?? {}).length,
    total: Object.keys(ORIGINALS).length,
  };
}
