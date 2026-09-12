import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { BaseRates } from "../base-rates";
import { getArcName } from "../data/arcs";
import { ContentShell } from "../content-shell";
import { hiatusStats } from "../data/summary";
import { nextChapter } from "../data/status";

export const HIATUS_PATH = "/hiatus";

// Either side of a break is a numbered chapter, or — once, in 2013 — a special
// one-shot that never received one. Naming the arc is more honest than a dash.
function boundary(
  locale: Locale,
  template: string,
  chapter: number | undefined,
  arc: string | undefined,
) {
  if (chapter) return formatMessage(template, { chapter });
  return getArcName(arc, locale) ?? "—";
}

export function hiatusMetadata(messages: Messages) {
  const historical = hiatusStats.historicalHiatuses;
  return {
    title: messages.pages.hiatus.metaTitle,
    description: formatMessage(messages.pages.hiatus.metaDescription, {
      count: historical.majorCount,
      threshold: historical.majorThreshold,
    }),
  };
}

export function HiatusPage({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const copy = messages.pages.hiatus;
  const historical = hiatusStats.historicalHiatuses;

  return (
    <ContentShell
      locale={locale}
      messages={messages}
      path={HIATUS_PATH}
      eyebrow="1998–2026"
      title={copy.h1}
      lede={copy.lede}
    >
      <BaseRates
        chapter={nextChapter.chapter}
        locale={locale}
        messages={messages}
      />

      <section
        aria-labelledby="hiatus-history-title"
        className="content-section"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.currentTitle}</p>
            <h2 id="hiatus-history-title">
              {formatMessage(copy.historyTitle, {
                threshold: historical.majorThreshold,
              })}
            </h2>
          </div>
        </div>
        <p className="section-lede">
          {formatMessage(copy.historyIntro, {
            count: historical.majorCount,
            threshold: historical.majorThreshold,
            max: historical.maxIssues,
          })}
        </p>

        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{copy.columnRank}</th>
                <th scope="col">{copy.columnSpan}</th>
                <th scope="col">{copy.columnLength}</th>
                <th scope="col">{copy.columnAfter}</th>
                <th scope="col">{copy.columnResumed}</th>
              </tr>
            </thead>
            <tbody>
              {historical.major.map((hiatus, index) => (
                <tr key={`${hiatus.startYear}-${hiatus.startIssue}`}>
                  <td>{index + 1}</td>
                  <td>
                    {formatMessage(copy.spanValue, {
                      startYear: hiatus.startYear,
                      startIssue: hiatus.startIssue,
                      endYear: hiatus.endYear,
                      endIssue: hiatus.endIssue,
                    })}
                  </td>
                  <td>
                    {formatMessage(copy.lengthValue, {
                      issues: hiatus.issues,
                      years: hiatus.approxYears,
                    })}
                  </td>
                  <td>
                    {boundary(
                      locale,
                      copy.afterValue,
                      hiatus.precededByChapter,
                      hiatus.precededByArc,
                    )}
                  </td>
                  <td>
                    {boundary(
                      locale,
                      copy.resumedValue,
                      hiatus.resumedWithChapter,
                      hiatus.resumedWithArc,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="hiatus-method-title" className="content-section">
        <div className="section-heading">
          <div>
            <h2 id="hiatus-method-title">{copy.methodTitle}</h2>
          </div>
        </div>
        <p className="prose">{copy.methodBody}</p>
      </section>
    </ContentShell>
  );
}
