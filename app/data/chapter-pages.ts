import historyData from "./publication-history.json";
import { chapters, type ChapterRecord } from "./status";

// A chapter earns a page when the tracker knows something about it. A chapter
// sitting at "unknown" has nothing to say beyond its number, and a page that
// says nothing is worse than no page: never generate one.
export const chapterPages: ChapterRecord[] = chapters.filter(
  (chapter) => chapter.status !== "unknown",
);

export const chapterPageNumbers = chapterPages.map(
  (chapter) => chapter.chapter,
);

const byNumber = new Map(
  chapterPages.map((chapter) => [chapter.chapter, chapter]),
);

const arcByChapter = new Map<number, string>();
for (const issue of historyData as { chapter?: number | string; arc?: string }[]) {
  const chapter =
    typeof issue.chapter === "number"
      ? issue.chapter
      : Number.parseInt(String(issue.chapter ?? ""), 10);
  if (Number.isInteger(chapter) && issue.arc) arcByChapter.set(chapter, issue.arc);
}

// Chapters the tracker follows but Jump has not printed yet have no row in the
// publication history, and every one of them belongs to the running arc.
const currentArcId = arcByChapter.get(Math.max(...arcByChapter.keys()));

export function getChapterPage(chapter: number) {
  return byNumber.get(chapter);
}

export function getChapterArcId(chapter: number) {
  return arcByChapter.get(chapter) ?? currentArcId;
}

export function getAdjacentChapters(chapter: number) {
  const index = chapterPageNumbers.indexOf(chapter);
  return {
    previous: index > 0 ? chapterPageNumbers[index - 1] : undefined,
    next:
      index >= 0 && index < chapterPageNumbers.length - 1
        ? chapterPageNumbers[index + 1]
        : undefined,
  };
}
