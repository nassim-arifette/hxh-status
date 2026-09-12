import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { localePath } from "@/lib/routes";
import { deriveReleaseForecast } from "./data/release-forecast";
import { hiatusStats } from "./data/summary";
import { nextChapter, publicationStatus, type ChapterRecord } from "./data/status";
import { formatDate } from "./status-presentation";

export function ReleaseForecast({ chapter, locale, messages }: { chapter: ChapterRecord; locale: Locale; messages: Messages }) {
  const copy = messages.forecast;
  const estimate = deriveReleaseForecast({ records: hiatusStats.historicalHiatuses.major, chapter: chapter.chapter, nextChapter: nextChapter.chapter, chapterStatus: chapter.status, publicationStatus, sinceDate: hiatusStats.currentHiatus.sinceDate });
  if (chapter.chapter !== nextChapter.chapter || chapter.status === "scheduled" || chapter.status === "published" || publicationStatus !== "hiatus") return null;
  const month = (date: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date));
  return (
    <section className="content-section forecast" aria-labelledby="forecast-title">
      <p className="eyebrow">{copy.badge}</p>
      <h2 id="forecast-title">{formatMessage(copy.title, { chapter: chapter.chapter })}</h2>
      <p className="section-lede">{copy.intro}</p>
      {!estimate ? <p className="prose">{copy.unavailable}</p> : <>
        <dl className="forecast-grid">
          <div><dt>{copy.median}</dt><dd>{month(estimate.medianDate)}</dd></div>
          <div><dt>{copy.range}</dt><dd>{month(estimate.lowerDate)} – {month(estimate.upperDate)}</dd></div>
        </dl>
        <p className="section-note">{formatMessage(copy.asOf, { date: formatDate(estimate.asOf, undefined, locale), count: estimate.remainingCount, total: estimate.sampleCount })}</p>
        <p className="prose">{copy.caution}</p>
        <details className="forecast-method">
          <summary>{copy.methodTitle}</summary>
          <p className="prose">{copy.method}</p>
          <p className="prose">{copy.conditioning}</p>
          <p className="prose">{copy.limits}</p>
          {estimate.allHistoryMedianDate ? <p className="prose">{formatMessage(copy.sensitivity, { date: month(estimate.allHistoryMedianDate) })}</p> : null}
          {estimate.backtest.count > 0 ? <p className="prose">{formatMessage(copy.backtest, { count: estimate.backtest.count, days: estimate.backtest.meanAbsoluteErrorDays!, covered: estimate.backtest.covered })}</p> : null}
          <div className="table-scroll">
            <table className="hiatus-table">
              <caption>{copy.sampleTitle}</caption>
              <thead><tr><th scope="col">{copy.returnChapter}</th><th scope="col">{copy.period}</th><th scope="col">{copy.issues}</th></tr></thead>
              <tbody>{estimate.samples.map(sample => <tr key={sample.resumedWithChapter}><th scope="row">{sample.resumedWithChapter}</th><td>{sample.startYear} #{sample.startIssue} – {sample.endYear} #{sample.endIssue}</td><td>{sample.issues}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="section-note"><a href={localePath("/hiatus", locale)}>{copy.historyLink}</a></p>
        </details>
      </>}
    </section>
  );
}
