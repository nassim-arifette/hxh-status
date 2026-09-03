import { getMessages } from "@/lib/dictionaries";
import { createLocaleMetadata } from "@/lib/metadata";
import StatusDashboard from "../status-dashboard";

const messages = getMessages("ja");

export const metadata = createLocaleMetadata("ja", messages);

export default function JapanesePreviewPage() {
  return <StatusDashboard locale="ja" messages={messages} />;
}
