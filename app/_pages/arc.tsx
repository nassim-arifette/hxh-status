import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { arcPath } from "@/lib/routes";
import { ContentShell } from "../content-shell";
import { formatArcDuration, formatArcYears, type ArcStats } from "../data/arcs";
import { arcStats } from "../data/summary";

export const SUCCESSION_WAR_PATH = arcPath("succession-war");

const byChapters = [...arcStats.arcs].sort(
  (a, b) => b.chapterCount - a.chapterCount,
);
const byDuration = [...arcStats.arcs].sort((a, b) => b.spanIssues - a.spanIssues);
const current = arcStats.currentArc;

function arcName(arc: ArcStats, locale: Locale) {
  return arc.name[locale] ?? arc.name.en;
}

// The arc to name alongside the current one: the runner-up when it leads that
// ranking, and the leader when it does not.
function comparison(
  rank: number,
  ordered: readonly ArcStats[],
  value: (arc: ArcStats) => string,
  locale: Locale,
) {
  const other = rank === 1 ? ordered[1] : ordered[0];
  return {
    rank,
    otherName: other ? arcName(other, locale) : "—",
    otherValue: other ? value(other) : "—",
  };
}

export function arcMetadata(messages: Messages) {
  const values = {
    count: current.chapterCount,
    years: current.spanYears,
    startYear: current.startYear,
  };

  return {
    title: formatMessage(messages.pages.arc.metaTitle, values),
    description: formatMessage(messages.pages.arc.metaDescription, values),
  };
}

export function ArcPage({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.pages.arc;

  // The two rankings genuinely disagree: the Succession War has been running
  // longer than any arc before it while the Chimera Ant arc still holds the
  // chapter record. Asserting "the longest arc" either way would be wrong, so
  // each measure states its own rank and names whichever arc sits above it.
  const duration = comparison(
    current.durationRank,
    byDuration,
    (arc) => formatArcDuration(arc, messages.history),
    locale,
  );
  const chapters = comparison(
    current.chapterRank,
    byChapters,
    (arc) => String(arc.chapterCount),
    locale,
  );

  const durationSentence =
    duration.rank === 1
      ? formatMessage(copy.durationLeads, {
          years: current.spanYears,
          startYear: current.startYear,
          runnerUpName: duration.otherName,
          runnerUpYears: duration.otherValue,
        })
      : formatMessage(copy.durationTrails, {
          rank: duration.rank,
          years: current.spanYears,
          startYear: current.startYear,
          leaderName: duration.otherName,
          leaderYears: duration.otherValue,
        });

  const chapterSentence =
    chapters.rank === 1
      ? formatMessage(copy.chaptersLeads, {
          count: current.chapterCount,
          runnerUpName: chapters.otherName,
          runnerUpCount: chapters.otherValue,
        })
      : formatMessage(copy.chaptersTrails, {
          rank: chapters.rank,
          count: current.chapterCount,
          leaderName: chapters.otherName,
          leaderCount: chapters.otherValue,
        });

  return (
    <ContentShell
      locale={locale}
      messages={messages}
      path={SUCCESSION_WAR_PATH}
      eyebrow={formatArcYears(current, locale)}
      title={copy.h1}
      lede={formatMessage(copy.lede, { startYear: current.startYear })}
    >
      <section aria-labelledby="arc-answer-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="arc-answer-title">{copy.answerTitle}</h2>
          </div>
        </div>
        <div className="arc-verdicts">
          <div><span>{copy.columnChapters}</span><strong>#{current.chapterRank} · {current.chapterCount}</strong><p className="prose">{chapterSentence}</p></div>
          <div><span>{copy.elapsedLabel}</span><strong>#{current.durationRank} · {formatArcDuration(current, messages.history)}</strong><p className="prose">{durationSentence}</p></div>
        </div>
      </section>

      <section aria-labelledby="arc-table-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="arc-table-title">{copy.tableTitle}</h2>
          </div>
        </div>

        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{copy.columnArc}</th>
                <th scope="col">{copy.columnChapters}</th>
                <th scope="col">{copy.columnYears}</th>
                <th scope="col">{copy.columnSpan}</th>
              </tr>
            </thead>
            <tbody>
              {byChapters.map((arc) => (
                <tr
                  key={arc.id}
                  data-current={arc.id === current.id ? "true" : undefined}
                >
                  <th scope="row">
                    <span
                      aria-hidden="true"
                      className="arc-swatch"
                      style={{ backgroundColor: arc.color }}
                    />
                    {arcName(arc, locale)}
                  </th>
                  <td>{arc.chapterCount}</td>
                  <td>{formatArcDuration(arc, messages.history)}</td>
                  <td>{formatArcYears(arc, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </ContentShell>
  );
}
