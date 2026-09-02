import type { Metadata } from "next";

import { getMessages } from "@/lib/dictionaries";
import StatusDashboard from "../status-dashboard";

const messages = getMessages("ja");

export const metadata: Metadata = {
  title: messages.metadata.title,
  description: messages.metadata.description,
  alternates: {
    canonical: "https://hxhstatus.com/ja",
  },
  openGraph: {
    title: messages.metadata.title,
    description: messages.metadata.description,
    url: "https://hxhstatus.com/ja",
    siteName: messages.metadata.siteName,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: messages.metadata.title,
    description: messages.metadata.description,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function JapanesePreviewPage() {
  return <StatusDashboard locale="ja" messages={messages} />;
}
