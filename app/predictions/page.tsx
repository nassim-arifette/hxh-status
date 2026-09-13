import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { PredictionsPage, PREDICTIONS_PATH, predictionsMetadata } from "../_pages/predictions";

const messages = getMessages("en");

export const metadata: Metadata = createPageMetadata({
  locale: "en",
  messages,
  path: PREDICTIONS_PATH,
  ...predictionsMetadata("en"),
});

export default function Page() {
  return <PredictionsPage locale="en" messages={messages} />;
}
