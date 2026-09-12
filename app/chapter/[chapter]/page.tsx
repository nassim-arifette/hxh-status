import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { chapterPath } from "@/lib/routes";
import { ChapterPage, chapterMetadata } from "../../_pages/chapter";
import { chapterPageNumbers, getChapterPage } from "../../data/chapter-pages";

const messages = getMessages("en");

export const dynamicParams = false;

export function generateStaticParams() {
  return chapterPageNumbers.map((chapter) => ({ chapter: String(chapter) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string }>;
}): Promise<Metadata> {
  const { chapter } = await params;
  const record = getChapterPage(Number(chapter));
  if (!record) return {};

  return createPageMetadata({
    locale: "en",
    messages,
    path: chapterPath(record.chapter),
    ...chapterMetadata(record, "en", messages),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const record = getChapterPage(Number(chapter));
  if (!record) notFound();

  return <ChapterPage chapter={record} locale="en" messages={messages} />;
}
