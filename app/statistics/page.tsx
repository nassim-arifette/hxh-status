import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { StatisticsPage, STATISTICS_PATH, statisticsMetadata } from "../_pages/statistics";

const messages = getMessages("en");

export const metadata: Metadata = createPageMetadata({
  locale: "en",
  messages,
  path: STATISTICS_PATH,
  ...statisticsMetadata(messages),
});

export default function Page() {
  return <StatisticsPage locale="en" messages={messages} />;
}
