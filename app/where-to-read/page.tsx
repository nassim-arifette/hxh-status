import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { WhereToReadPage, WHERE_TO_READ_PATH, whereToReadMetadata } from "../_pages/where-to-read";

const messages = getMessages("en");

export const metadata: Metadata = createPageMetadata({
  locale: "en",
  messages,
  path: WHERE_TO_READ_PATH,
  ...whereToReadMetadata(messages),
});

export default function Page() {
  return <WhereToReadPage locale="en" messages={messages} />;
}
