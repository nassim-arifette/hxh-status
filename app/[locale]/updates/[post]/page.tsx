import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createPageMetadata } from "@/lib/metadata";
import { updatePath } from "@/lib/routes";
import { localeMessages, localeParams, resolveLocale } from "../../../_pages/locale-route";
import { UpdatePage, updateMetadata } from "../../../_pages/update";
import { getPost, togashiPosts } from "../../../data/updates";

export const dynamicParams = false;

export function generateStaticParams() {
  return localeParams().flatMap(({ locale }) =>
    togashiPosts.map((post) => ({ locale, post: post.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; post: string }>;
}): Promise<Metadata> {
  const { locale, post } = await params;
  const record = getPost(post);
  if (!record) return {};

  const resolved = resolveLocale(locale);
  const messages = localeMessages(locale);

  return createPageMetadata({
    locale: resolved,
    messages,
    path: updatePath(record.id),
    ...updateMetadata(record, resolved, messages),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; post: string }>;
}) {
  const { locale, post } = await params;
  const record = getPost(post);
  if (!record) notFound();

  return (
    <UpdatePage
      locale={resolveLocale(locale)}
      messages={localeMessages(locale)}
      post={record}
    />
  );
}
