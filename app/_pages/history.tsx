import type { Locale, Messages } from "@/lib/i18n";
import { ContentShell } from "../content-shell";
import { PublicationHistorySection } from "../status-dashboard";

export const HISTORY_PATH = "/history";
export function historyMetadata(messages: Messages) {
  // The page is the community's "hiatus chart", which is what readers search
  // for; the visible title stays the site's own name for the section.
  return { title: messages.pages.history.metaTitle, description: messages.pages.history.metaDescription };
}
export function HistoryPage({ locale, messages }: { locale: Locale; messages: Messages }) {
  return <ContentShell locale={locale} messages={messages} path={HISTORY_PATH} title={messages.history.title} lede={messages.history.intro}>
    <PublicationHistorySection locale={locale} messages={messages} />
  </ContentShell>;
}
