import { formatMessage, type Messages } from "@/lib/i18n";
import type { HiatusStatsSummary } from "./data/hiatus-stats";

// No state and no hooks, so this stays a server component: the numbers are
// computed at build time and the section ships no JavaScript at all.

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
}) {
  return (
    <article className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-sub">{sub}</span>
    </article>
  );
}

export function HiatusStatistics({
  summary,
  messages,
}: {
  summary: HiatusStatsSummary;
  messages: Messages["stats"];
}) {
  const historical = summary.historicalHiatuses;
  const runs = summary.publicationRuns;
  const rate = summary.publicationRate;

  return (
    <div className="stats-overview">
      <div className="stat-grid">
        <Stat
          label={messages.historicalHiatus.title}
          value={formatMessage(messages.historicalHiatus.majorMedian, {
            issues: historical.medianIssuesMajor,
            years: Number((historical.medianIssuesMajor / 48).toFixed(1)),
          })}
          sub={
            <>
              {formatMessage(messages.historicalHiatus.majorMedianLabel, {
                count: historical.majorCount,
              })}
              <span className="stat-supporting">
                {formatMessage(messages.historicalHiatus.record, {
                  issues: historical.maxIssues,
                  years: historical.maxHiatus.approxYears,
                })}
                {" · "}
                {formatMessage(messages.historicalHiatus.recordLabel, {
                  startYear: historical.maxHiatus.startYear,
                  startIssue: historical.maxHiatus.startIssue,
                  endYear: historical.maxHiatus.endYear,
                  endIssue: historical.maxHiatus.endIssue,
                })}
              </span>
            </>
          }
        />

        <Stat
          label={messages.publicationPace.title}
          value={formatMessage(messages.publicationPace.modernBatch, {
            batch: runs.recentBatchSize,
          })}
          sub={
            <>
              {formatMessage(messages.publicationPace.modernBatchLabel, {
                count: runs.recentRunsCount,
                batch: runs.recentBatchSize,
              })}
              <span className="stat-supporting">
                {formatMessage(messages.publicationPace.recordRun, {
                  count: runs.longestRun.length,
                  startYear: runs.longestRun.startYear,
                  endYear: runs.longestRun.endYear,
                })}
              </span>
            </>
          }
        />

        <Stat
          label={messages.publicationRate.title}
          value={formatMessage(messages.publicationRate.rate, {
            percent: rate.publishedPercentage,
          })}
          sub={
            <>
              {formatMessage(messages.publicationRate.rateLabel, {
                published: rate.totalChaptersPublished,
                total: rate.totalJumpIssues,
              })}
            </>
          }
        />
      </div>

      <p className="stat-methodology">{messages.methodology}</p>
    </div>
  );
}
