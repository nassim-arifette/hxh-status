import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { UpdatesPage, UPDATES_PATH, updatesMetadata } from "../_pages/updates";

const messages = getMessages("en");

export const metadata: Metadata = createPageMetadata({
  locale: "en",
  messages,
  path: UPDATES_PATH,
  ...updatesMetadata(messages),
});

export default function Page() {
  return <UpdatesPage locale="en" messages={messages} />;
}
