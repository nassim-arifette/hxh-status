import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { siteUrl } from "@/lib/routes";
import { ContentShell } from "../content-shell";
import { hiatusStats } from "../data/summary";
import { lastUpdated } from "../data/status";
import { HiatusStatistics } from "../hiatus-statistics";
import { datasetLd } from "../structured-data";

export const STATISTICS_PATH = "/statistics";

export function statisticsMetadata(messages: Messages) {
  const rate = hiatusStats.publicationRate;
  return {
    title: formatMessage(messages.pages.statistics.metaTitle, {
      published: rate.totalChaptersPublished,
      total: rate.totalJumpIssues,
    }),
    description: formatMessage(messages.pages.statistics.metaDescription, {
      percent: rate.publishedPercentage,
      median: hiatusStats.historicalHiatuses.medianIssuesMajor,
    }),
  };
}

export function StatisticsPage({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.pages.statistics;
  const runs = hiatusStats.publicationRuns;
  const meta = statisticsMetadata(messages);

  return (
    <ContentShell
      locale={locale}
      messages={messages}
      path={STATISTICS_PATH}
      eyebrow={messages.stats.eyebrow}
      title={copy.h1}
      lede={copy.lede}
      jsonLd={[
        datasetLd({
          name: meta.title,
          description: meta.description,
          locale,
          modified: lastUpdated,
          temporalCoverage: "1998-03/..",
        }),
      ]}
    >
      <section aria-labelledby="stats-overview-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="stats-overview-title">{messages.stats.title}</h2>
          </div>
        </div>
        <HiatusStatistics summary={hiatusStats} messages={messages.stats} />
      </section>

      <section aria-labelledby="stats-runs-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="stats-runs-title">{copy.runsTitle}</h2>
          </div>
        </div>
        <p className="section-lede">{copy.runsIntro}</p>

        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{copy.columnRun}</th>
                <th scope="col">{copy.columnChapters}</th>
                <th scope="col">{copy.columnLength}</th>
              </tr>
            </thead>
            <tbody>
              {runs.recent.map((run) => (
                <tr key={`${run.startYear}-${run.startIssue}`}>
                  <td>
                    {formatMessage(copy.runSpan, {
                      startYear: run.startYear,
                      startIssue: run.startIssue,
                      endYear: run.endYear,
                      endIssue: run.endIssue,
                    })}
                  </td>
                  <td>
                    {formatMessage(copy.runChapters, {
                      start: String(run.startChapter ?? "—"),
                      end: String(run.endChapter ?? "—"),
                    })}
                  </td>
                  <td>
                    {formatMessage(copy.runLength, { count: run.length })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="stats-dataset-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="stats-dataset-title">{copy.datasetTitle}</h2>
          </div>
        </div>
        <p className="prose">
          {copy.datasetBody}{" "}
          <a href={`${siteUrl}/api/v1/stats.json`}>/api/v1/stats.json</a>
        </p>
      </section>
    </ContentShell>
  );
}
