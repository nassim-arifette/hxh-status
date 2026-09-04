import { getMessages } from "@/lib/dictionaries";
import { createLocaleMetadata } from "@/lib/metadata";
import StatusDashboard from "../status-dashboard";

const messages = getMessages("pt");

export const metadata = createLocaleMetadata("pt", messages);

export default function PortuguesePreviewPage() {
  return <StatusDashboard locale="pt" messages={messages} />;
}
