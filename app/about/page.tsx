import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { AboutPage, ABOUT_PATH, aboutMetadata } from "../_pages/about";

const messages = getMessages("en");

export const metadata: Metadata = createPageMetadata({
  locale: "en",
  messages,
  path: ABOUT_PATH,
  ...aboutMetadata(messages),
});

export default function Page() {
  return <AboutPage locale="en" messages={messages} />;
}
