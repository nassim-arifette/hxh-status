import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { HistoryPage, HISTORY_PATH, historyMetadata } from "../_pages/history";

const messages = getMessages("en");

export const metadata: Metadata = createPageMetadata({
  locale: "en",
  messages,
  path: HISTORY_PATH,
  ...historyMetadata(messages),
});

export default function Page() {
  return <HistoryPage locale="en" messages={messages} />;
}
