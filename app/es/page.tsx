import { getMessages } from "@/lib/dictionaries";
import { createLocaleMetadata } from "@/lib/metadata";
import StatusDashboard from "../status-dashboard";

const messages = getMessages("es");

export const metadata = createLocaleMetadata("es", messages);

export default function SpanishPreviewPage() {
  return <StatusDashboard locale="es" messages={messages} />;
}
