import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createPageMetadata } from "@/lib/metadata";
import { chapterPath } from "@/lib/routes";
import { ChapterPage, chapterMetadata } from "../../../_pages/chapter";
import { localeMessages, localeParams, resolveLocale } from "../../../_pages/locale-route";
import { chapterPageNumbers, getChapterPage } from "../../../data/chapter-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return localeParams().flatMap(({ locale }) =>
    chapterPageNumbers.map((chapter) => ({ locale, chapter: String(chapter) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; chapter: string }>;
}): Promise<Metadata> {
  const { locale, chapter } = await params;
  const record = getChapterPage(Number(chapter));
  if (!record) return {};

  const resolved = resolveLocale(locale);
  const messages = localeMessages(locale);

  return createPageMetadata({
    locale: resolved,
    messages,
    path: chapterPath(record.chapter),
    ...chapterMetadata(record, resolved, messages),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; chapter: string }>;
}) {
  const { locale, chapter } = await params;
  const record = getChapterPage(Number(chapter));
  if (!record) notFound();

  return (
    <ChapterPage
      chapter={record}
      locale={resolveLocale(locale)}
      messages={localeMessages(locale)}
    />
  );
}
