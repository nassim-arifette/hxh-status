import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { localePath } from "@/lib/routes";
import { hiatusStats } from "./data/summary";

// The honest answer to "when is the next chapter" is that nobody outside
// Shueisha knows. Saying only that is useless, so the question is answered with
// the base rates the site already computes: what the record has done before,
// labelled as observation. No arithmetic here turns into a date.

export function BaseRates({
  chapter,
  headingLevel = "h2",
  locale,
  messages,
}: {
  chapter: number;
  headingLevel?: "h2" | "h3";
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.baseRates;
  const current = hiatusStats.currentHiatus;
  const historical = hiatusStats.historicalHiatuses;
  const runs = hiatusStats.publicationRuns;
  const rate = hiatusStats.publicationRate;
  const Heading = headingLevel;

  const rows = [
    {
      id: "elapsed",
      label: copy.elapsedLabel,
      value: formatMessage(copy.elapsedValue, {
        issues: current.elapsedIssues,
      }),
      note: formatMessage(copy.elapsedNote, {
        days: current.elapsedDays,
        chapter: current.sinceChapter,
        jumpIssue: current.sinceJumpIssue,
      }),
    },
    {
      id: "median",
      label: copy.medianLabel,
      value: formatMessage(copy.medianValue, {
        issues: historical.medianIssuesMajor,
      }),
      note: formatMessage(copy.medianNote, {
        count: historical.majorCount,
        threshold: historical.majorThreshold,
      }),
    },
    {
      id: "runs",
      label: copy.runsLabel,
      value: formatMessage(copy.runsValue, { batch: runs.recentBatchSize }),
      note: formatMessage(copy.runsNote, {
        count: runs.recentRunsCount,
        batch: runs.recentBatchSize,
      }),
    },
    {
      id: "presence",
      label: copy.presenceLabel,
      value: formatMessage(copy.presenceValue, {
        percent: rate.publishedPercentage,
      }),
      note: formatMessage(copy.presenceNote, {
        published: rate.totalChaptersPublished,
        total: rate.totalJumpIssues,
      }),
    },
  ];

  return (
    <section
      aria-labelledby="base-rates-title"
      className="content-section base-rates"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {formatMessage(copy.eyebrow, { chapter })}
          </p>
          <Heading id="base-rates-title">{copy.title}</Heading>
        </div>
      </div>

      <p className="section-lede">{formatMessage(copy.answer, { chapter })}</p>
      <p className="base-rates-badge">{copy.badge}</p>

      <dl className="base-rates-grid">
        {rows.map((row) => (
          <div className="base-rate" key={row.id}>
            <dt>{row.label}</dt>
            <dd>
              <strong>{row.value}</strong>
              <span>{row.note}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="base-rates-more">
        <a href={localePath("/hiatus", locale)}>{copy.more}</a>
      </p>
    </section>
  );
}
