import { formatMessage, type Messages } from "@/lib/i18n";
import type { HiatusStatsSummary } from "./data/hiatus-stats";

// No state and no hooks, so this stays a server component: the numbers are
// computed at build time and the section ships no JavaScript at all.

function Stat({
  label,
  value,
  sub,
  detail,
  footnote,
}: {
  label: string;
  value: string;
  sub: string;
  detail?: React.ReactNode;
  footnote?: string;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-sub">{sub}</span>
      {detail ? <span className="stat-detail">{detail}</span> : null}
      {footnote ? <span className="stat-footnote">{footnote}</span> : null}
    </div>
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
    <>
      {/* The break the reader came to check, given the weight the page gives
          the status headline rather than an equal share of a five-card grid. */}
      <div className="stat-current">
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
      </div>

      <div className="stat-grid">
        <Stat
          label={messages.historicalHiatus.title}
          value={formatMessage(messages.historicalHiatus.majorMedian, {
            issues: historical.medianIssuesMajor,
            years: Number((historical.medianIssuesMajor / 48).toFixed(1)),
          })}
          sub={formatMessage(messages.historicalHiatus.majorMedianLabel, {
            count: historical.majorCount,
          })}
          detail={
            <>
              {formatMessage(messages.historicalHiatus.recordLabel, {
                startYear: historical.maxHiatus.startYear,
                startIssue: historical.maxHiatus.startIssue,
                endYear: historical.maxHiatus.endYear,
                endIssue: historical.maxHiatus.endIssue,
              })}
              {": "}
              <strong>
                {formatMessage(messages.historicalHiatus.record, {
                  issues: historical.maxIssues,
                  years: historical.maxHiatus.approxYears,
                })}
              </strong>
            </>
          }
          footnote={formatMessage(messages.historicalHiatus.allMedian, {
            issues: historical.medianIssuesAll,
            count: historical.totalCount,
          })}
        />

        <Stat
          label={messages.publicationPace.title}
          value={formatMessage(messages.publicationPace.modernBatch, {
            batch: runs.modernBatchSize,
          })}
          sub={messages.publicationPace.modernBatchLabel}
          detail={formatMessage(messages.publicationPace.historicalMedian, {
            count: runs.medianRunLength,
            total: runs.totalRunsCount,
          })}
          footnote={formatMessage(messages.publicationPace.recordRun, {
            count: runs.longestRun.length,
            startYear: runs.longestRun.startYear,
            endYear: runs.longestRun.endYear,
          })}
        />

        <Stat
          label={messages.productionLeadTime.title}
          value={formatMessage(messages.productionLeadTime.medianDelay, {
            days: Math.round(leadTime.medianLeadTimeDays),
          })}
          sub={formatMessage(messages.productionLeadTime.medianDelayLabel, {
            count: leadTime.observedBatchesCount,
          })}
          detail={formatMessage(messages.productionLeadTime.currentDelivered, {
            delivered: leadTime.currentDeliveredCount,
            target: leadTime.currentDeliveredTarget,
          })}
          footnote={messages.productionLeadTime.footnote}
        />

        <Stat
          label={messages.publicationRate.title}
          value={formatMessage(messages.publicationRate.rate, {
            percent: rate.publishedPercentage,
          })}
          sub={formatMessage(messages.publicationRate.rateLabel, {
            published: rate.totalChaptersPublished,
            total: rate.totalJumpIssues,
          })}
          footnote={formatMessage(messages.publicationRate.hiatusRate, {
            percent: rate.hiatusPercentage,
          })}
        />
      </div>

      <p className="stat-methodology">{messages.methodology}</p>
    </>
  );
}
