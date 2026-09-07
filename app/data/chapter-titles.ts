import type { Locale } from "@/lib/i18n";
import source from "./chapter-titles/_source.json";
import ar from "./chapter-titles/ar.json";
import en from "./chapter-titles/en.json";
import es from "./chapter-titles/es.json";
import fr from "./chapter-titles/fr.json";
import ja from "./chapter-titles/ja.json";
import pt from "./chapter-titles/pt.json";
import zh from "./chapter-titles/zh.json";

export type ChapterTitleInfo = {
  number: number;
  original: string;
  titles: Partial<Record<Locale, string>> & { en: string };
};

type TitleFile = Record<string, string>;

// One file per locale so a translator can own a single document, and so the
// coverage check has something to count. `_source.json` holds the Japanese
// titles every translation is made from.
const TITLES: Record<Locale, TitleFile> = { en, fr, ja, es, pt, zh, ar };
const ORIGINALS: TitleFile = source.chapters;

export const CHAPTER_TITLE_LABEL: Record<Locale, string> = {
  en: "Chapter Title",
  fr: "Titre du chapitre",
  ja: "サブタイトル",
  es: "Título del capítulo",
  pt: "Título do capítulo",
  zh: "章节标题",
  ar: "عنوان الفصل",
};

export const VOLUME_LABEL: Record<Locale, string> = {
  en: "Volume",
  fr: "Tome",
  ja: "巻",
  es: "Volumen",
  pt: "Volume",
  zh: "单行本",
  ar: "المجلد",
};

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

// Tankōbon do not hold ten chapters each — volume 1 holds eight and volumes 2
// to 5 hold nine — so the released volumes are listed rather than computed.
// Only chapters past the last published volume fall back to the ten-per-volume
// pace Shueisha has kept since volume 6.
export function getVolumeNumber(chapter: number): number {
  if (!Number.isInteger(chapter) || chapter < 1) return 0;
  const released = source.volumes.find(
    (volume) => chapter >= volume.from && chapter <= volume.to,
  );
  if (released) return released.volume;
  const last = source.volumes[source.volumes.length - 1];
  return (
    last.volume +
    Math.ceil((chapter - last.to) / source.chaptersPerLaterVolume)
  );
}

export function getVolumeLabel(chapter: number, locale: Locale = "en"): string {
  const volume = getVolumeNumber(chapter);
  const prefix = VOLUME_LABEL[locale] ?? VOLUME_LABEL.en;
  if (locale === "ja") return `${volume}巻`;
  if (locale === "zh") return `第${volume}卷`;
  return `${prefix} ${volume}`;
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
