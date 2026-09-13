import type { Locale, Messages } from "@/lib/i18n";
import { ContentShell } from "../content-shell";
import { PublicationHistorySection } from "../status-dashboard";

export const HISTORY_PATH = "/history";
export function historyMetadata(messages: Messages) {
  return { title: messages.history.title, description: messages.history.intro };
}
export function HistoryPage({ locale, messages }: { locale: Locale; messages: Messages }) {
  return <ContentShell locale={locale} messages={messages} path={HISTORY_PATH} title={messages.history.title} lede={messages.history.intro}>
    <PublicationHistorySection locale={locale} messages={messages} />
  </ContentShell>;
}
