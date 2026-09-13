import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";
import { localeMessages, localeParams, resolveLocale } from "../../_pages/locale-route";
import { PredictionsPage, PREDICTIONS_PATH, predictionsMetadata } from "../../_pages/predictions";

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
    path: PREDICTIONS_PATH,
    ...predictionsMetadata(resolveLocale(locale)),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PredictionsPage locale={resolveLocale(locale)} messages={localeMessages(locale)} />
  );
}
