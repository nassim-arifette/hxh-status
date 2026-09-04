import { getMessages } from "@/lib/dictionaries";
import { createLocaleMetadata } from "@/lib/metadata";
import StatusDashboard from "../status-dashboard";

const messages = getMessages("ar");

export const metadata = createLocaleMetadata("ar", messages);

export default function ArabicPreviewPage() {
  return <StatusDashboard locale="ar" messages={messages} />;
}
