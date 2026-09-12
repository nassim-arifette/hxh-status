import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { ArcPage, SUCCESSION_WAR_PATH, arcMetadata } from "../../_pages/arc";

const messages = getMessages("en");

export const metadata: Metadata = createPageMetadata({
  locale: "en",
  messages,
  path: SUCCESSION_WAR_PATH,
  ...arcMetadata(messages),
});

export default function Page() {
  return <ArcPage locale="en" messages={messages} />;
}
