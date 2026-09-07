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
  const current = summary.currentHiatus;
  const historical = summary.historicalHiatuses;
  const runs = summary.publicationRuns;
  const leadTime = summary.leadTime;
  const rate = summary.publicationRate;

  const elapsed = current.isJustStarted
    ? messages.currentHiatus.justStarted
    : formatMessage(messages.currentHiatus.elapsed, {
        issues: current.elapsedIssues,
        days: current.elapsedDays,
      });

  const rank = formatMessage(
    current.isJustStarted
      ? messages.currentHiatus.rankJustStarted
      : messages.currentHiatus.rank,
    { rank: current.historicalRank, total: current.totalHistoricalHiatuses },
  );

  return (
    <div className="stats-overview">
      <article className="stat-current">
        <div className="stat-current-head">
          <span className="stat-label">{messages.currentHiatus.title}</span>
          <span className="stat-rank">{rank}</span>
        </div>
        <strong className="stat-current-value">{elapsed}</strong>
        <span className="stat-current-since">
          {formatMessage(messages.currentHiatus.since, {
            chapter: current.sinceChapter,
            jumpIssue: current.sinceJumpIssue,
          })}
        </span>
      </article>

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
            batch: runs.modernBatchSize,
          })}
          sub={
            <>
              {messages.publicationPace.modernBatchLabel}
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
              <span className="stat-supporting">
                {formatMessage(messages.publicationRate.hiatusRate, {
                  percent: rate.hiatusPercentage,
                })}
              </span>
            </>
          }
        />
      </div>

      <div className="stat-context">
        <div>
          <span className="stat-context-label">{messages.productionLeadTime.title}</span>
          <strong>
            {formatMessage(messages.productionLeadTime.medianDelay, {
              days: Math.round(leadTime.medianLeadTimeDays),
            })}
          </strong>
        </div>
        <span>
          {formatMessage(messages.productionLeadTime.currentDelivered, {
            delivered: leadTime.currentDeliveredCount,
            target: leadTime.currentDeliveredTarget,
          })}
        </span>
      </div>

      <p className="stat-methodology">{messages.methodology}</p>
    </div>
  );
}
