import { notFound } from "next/navigation";

import { getMessages } from "@/lib/dictionaries";
import { isLocale, locales } from "@/lib/i18n";
import { PublicationHistorySection } from "../../../status-dashboard";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocalizedPublicationHistoryCapturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  return (
    <main className="share-capture-page" lang={locale}>
      <PublicationHistorySection
        capture
        locale={locale}
        messages={getMessages(locale)}
      />
    </main>
  );
}
