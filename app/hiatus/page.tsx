import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { HiatusPage, HIATUS_PATH, hiatusMetadata } from "../_pages/hiatus";

const messages = getMessages("en");

export const metadata: Metadata = createPageMetadata({
  locale: "en",
  messages,
  path: HIATUS_PATH,
  ...hiatusMetadata(messages),
});

export default function Page() {
  return <HiatusPage locale="en" messages={messages} />;
}
