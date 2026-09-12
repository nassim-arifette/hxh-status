import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";
import { localeMessages, localeParams, resolveLocale } from "../../_pages/locale-route";
import { HiatusPage, HIATUS_PATH, hiatusMetadata } from "../../_pages/hiatus";

export const dynamicParams = false;

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = localeMessages(locale);

  return createPageMetadata({
    locale: resolveLocale(locale),
    messages,
    path: HIATUS_PATH,
    ...hiatusMetadata(messages),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <HiatusPage locale={resolveLocale(locale)} messages={localeMessages(locale)} />
  );
}
