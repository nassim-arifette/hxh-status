import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";
import { localeMessages, localeParams, resolveLocale } from "../../_pages/locale-route";
import { ApiPage, API_PATH, apiMetadata } from "../../_pages/api";

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
    path: API_PATH,
    ...apiMetadata(messages),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <ApiPage locale={resolveLocale(locale)} messages={localeMessages(locale)} />
  );
}
