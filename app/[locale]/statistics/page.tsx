import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";
import { localeMessages, localeParams, resolveLocale } from "../../_pages/locale-route";
import { StatisticsPage, STATISTICS_PATH, statisticsMetadata } from "../../_pages/statistics";

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
    path: STATISTICS_PATH,
    ...statisticsMetadata(messages),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <StatisticsPage locale={resolveLocale(locale)} messages={localeMessages(locale)} />
  );
}
