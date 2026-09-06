import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMessages } from "@/lib/dictionaries";
import { isLocale, isPublicLocale, publicLocales } from "@/lib/i18n";
import { createLocaleMetadata } from "@/lib/metadata";
import StatusDashboard from "../status-dashboard";

export const dynamicParams = false;

export function generateStaticParams() {
  return publicLocales
    .filter((locale) => locale !== "en")
    .map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale) || !isPublicLocale(locale) || locale === "en") {
    return {};
  }

  const messages = getMessages(locale);
  return createLocaleMetadata(locale, messages);
}

export default async function LocalizedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale) || !isPublicLocale(locale) || locale === "en") {
    notFound();
  }

  const messages = getMessages(locale);
  return <StatusDashboard locale={locale} messages={messages} />;
}
