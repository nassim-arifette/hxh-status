import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { ApiPage, API_PATH, apiMetadata } from "../_pages/api";

const messages = getMessages("en");

export const metadata: Metadata = createPageMetadata({
  locale: "en",
  messages,
  path: API_PATH,
  ...apiMetadata(messages),
});

export default function Page() {
  return <ApiPage locale="en" messages={messages} />;
}
