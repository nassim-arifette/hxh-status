import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { ContentShell } from "../content-shell";
import PredictionGame from "../prediction-game";
import { gameCopy } from "../game-copy";
export const PREDICTIONS_PATH = "/predictions";
export function predictionsMetadata(locale: Locale) { const t = gameCopy(locale); return { title: t.title, description: t.intro }; }
export function PredictionsPage({ locale, messages }: { locale: Locale; messages: Messages }) {
 const t = gameCopy(locale);
 return <ContentShell className="predictions-page" locale={locale} messages={messages} path={PREDICTIONS_PATH} title={formatMessage(t.heroTitle, { chapter: 421 })} lede={t.intro}><PredictionGame locale={locale} /></ContentShell>;
}
