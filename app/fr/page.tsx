import { getMessages } from "@/lib/dictionaries";
import { createLocaleMetadata } from "@/lib/metadata";
import StatusDashboard from "../status-dashboard";

const messages = getMessages("fr");

export const metadata = createLocaleMetadata("fr", messages);

export default function FrenchPage() {
  return <StatusDashboard locale="fr" messages={messages} />;
}
