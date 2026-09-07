import type { Locale } from "@/lib/i18n";
import volumes from "./chapter-titles/_volumes.json";

// The parts of the chapter data a client component can afford to import: two
// label tables and 39 volume ranges, a few kilobytes in all. The titles
// themselves live in chapter-titles.ts, which pulls every locale and so must
// stay on the server; components receive the active locale's titles as a prop.

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

// Tankōbon do not hold ten chapters each — volume 1 holds eight and volumes 2
// to 5 hold nine — so the released volumes are listed rather than computed.
// Only chapters past the last published volume fall back to the ten-per-volume
// pace Shueisha has kept since volume 6.
export function getVolumeNumber(chapter: number): number {
  if (!Number.isInteger(chapter) || chapter < 1) return 0;
  const released = volumes.volumes.find(
    (volume) => chapter >= volume.from && chapter <= volume.to,
  );
  if (released) return released.volume;
  const last = volumes.volumes[volumes.volumes.length - 1];
  return (
    last.volume + Math.ceil((chapter - last.to) / volumes.chaptersPerLaterVolume)
  );
}

export function getVolumeLabel(chapter: number, locale: Locale = "en"): string {
  const volume = getVolumeNumber(chapter);
  const prefix = VOLUME_LABEL[locale] ?? VOLUME_LABEL.en;
  if (locale === "ja") return `${volume}巻`;
  if (locale === "zh") return `第${volume}卷`;
  return `${prefix} ${volume}`;
}
