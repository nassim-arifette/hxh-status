import { getMessages } from "@/lib/dictionaries";
import { createLocaleMetadata } from "@/lib/metadata";
import StatusDashboard from "../status-dashboard";

const messages = getMessages("zh");

export const metadata = createLocaleMetadata("zh", messages);

export default function ChinesePreviewPage() {
  return <StatusDashboard locale="zh" messages={messages} />;
}
