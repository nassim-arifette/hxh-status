import { CalendarDays, ExternalLink } from "lucide-react";

import ChapterTracker from "./chapter-tracker";
import historyData from "./data/publication-history.json";
import {
  chapters,
  lastUpdated,
  latestPublished,
  latestUpdate,
  manuscriptsComplete,
  nextChapter,
  serialization,
  workConfirmed,
  type ChapterStatus,
} from "./data/status";
import { formatDate, lowerFirst, statusMeta } from "./status-presentation";

type PublicationIssue = {
  year: number;
  number: number;
  released?: boolean;
  chapter?: number | string;
  date?: string;
};

const issues = historyData as PublicationIssue[];

const currentYear = issues.reduce(
  (latest, issue) => Math.max(latest, issue.year),
  0,
);

const chaptersThisYear = issues.filter(
  (issue) => issue.year === currentYear && issue.released,
).length;

const publicationByYear = (() => {
  const grouped = new Map<number, PublicationIssue[]>();

  for (const issue of issues) {
    const current = grouped.get(issue.year) ?? [];
    current.push(issue);
    grouped.set(issue.year, current);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, yearIssues]) => ({
      year,
      issues: [...yearIssues].sort((a, b) => a.number - b.number),
    }));
})();

const serializationHeadline = {
  publishing: "Serializing",
  hiatus: "On hiatus",
} as const;

function Legend() {
  return (
    <div className="legend" aria-label="Status legend">
      {(Object.keys(statusMeta) as ChapterStatus[]).map((status) => {
        const meta = statusMeta[status];
        const StatusIcon = meta.icon;

        return (
          <div className="legend-item" data-status={status} key={status}>
            <span className="legend-icon" aria-hidden="true">
              <StatusIcon size={15} strokeWidth={2.2} />
            </span>
            <span>{meta.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PublicationHistory() {
  return (
    <div
      className="history-scroll"
      tabIndex={0}
      aria-label="Publication history chart"
    >
      <div className="history-chart">
        {publicationByYear.map(({ year, issues: yearIssues }) => {
          const publishedCount = yearIssues.filter(
            (issue) => issue.released,
          ).length;

          return (
            <div className="history-row" key={year}>
              <span className="history-year">{year}</span>
              <div className="history-cells">
                {yearIssues.map((issue) => {
                  const detail = issue.released
                    ? `WSJ ${issue.number}: chapter ${issue.chapter} published`
                    : `WSJ ${issue.number}: no chapter`;

                  return (
                    <span
                      className="history-cell"
                      data-released={issue.released ? "true" : "false"}
                      key={`${issue.year}-${issue.number}`}
                      title={detail}
                      aria-label={detail}
                      role="img"
                    />
                  );
                })}
              </div>
              <span
                className="history-count"
                aria-label={`${publishedCount} chapters`}
              >
                {String(publishedCount).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StatusDashboard() {
  return (
    <main id="top" className="site-shell">
      <div className="page-frame">
        <header className="site-header">
          <a className="wordmark" href="#top" aria-label="H×H Status">
            <span className="wordmark-hxh">
              H<span className="wordmark-times">×</span>H
            </span>
            <span className="wordmark-status">Status</span>
          </a>
          <div className="updated-label">
            <span className="live-dot" aria-hidden="true" />
            Updated {formatDate(lastUpdated, { month: "short", day: "numeric" })}
          </div>
        </header>

        <section className="snapshot" aria-labelledby="serialization-title">
          <div className="serialization" data-state={serialization}>
            <h1 id="serialization-title">
              <span className="serialization-dot" aria-hidden="true" />
              {serializationHeadline[serialization]}
            </h1>
            <p className="serialization-detail">
              {chaptersThisYear} chapters published in {currentYear}.
            </p>
          </div>

          <div className="metric-grid">
            <article className="metric metric-primary">
              <span>Latest published</span>
              <strong>{latestPublished.chapter}</strong>
              <small>WSJ #{latestPublished.jumpIssue}</small>
            </article>
            <article className="metric">
              <span>Next chapter</span>
              <strong>{nextChapter.chapter}</strong>
              <small>
                {nextChapter.scheduleLabel ??
                  statusMeta[nextChapter.status].shortLabel}
              </small>
            </article>
            <article className="metric">
              <span>Manuscripts complete</span>
              <strong>{manuscriptsComplete.chapter}</strong>
              <small>through chapter</small>
            </article>
            <article className="metric">
              <span>Work confirmed</span>
              <strong>{workConfirmed.chapter}</strong>
              <small>through chapter</small>
            </article>
          </div>
        </section>

        <section
          className="content-section production-section"
          aria-labelledby="production-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Kakin Succession Contest</p>
              <h2 id="production-title">Production tracker</h2>
            </div>
          </div>

          <ChapterTracker chapters={chapters} lastUpdated={lastUpdated} />
          <Legend />
        </section>

        <section className="latest-update" aria-labelledby="latest-update-title">
          <div className="update-date">
            <CalendarDays size={17} aria-hidden="true" />
            <span>{formatDate(latestUpdate.updatedAt)}</span>
          </div>
          <div className="update-copy">
            <p className="eyebrow">Latest Togashi update</p>
            <h2 id="latest-update-title">
              Chapter {latestUpdate.chapter}{" "}
              {lowerFirst(statusMeta[latestUpdate.status].label)}.
            </h2>
          </div>
          <a
            href={latestUpdate.source}
            className="source-link update-link"
            rel="noreferrer"
            target="_blank"
          >
            View post
            <ExternalLink size={15} />
          </a>
        </section>

        <section
          className="content-section history-section"
          aria-labelledby="history-title"
        >
          <div className="section-heading history-heading">
            <div>
              <p className="eyebrow">1998–2026</p>
              <h2 id="history-title">Publication history</h2>
            </div>
          </div>

          <div className="history-key">
            <span>
              <i className="key-cell key-published" /> Chapter published
            </span>
            <span>
              <i className="key-cell key-hiatus" /> No chapter
            </span>
            <span className="history-key-count">
              right column: chapters / year
            </span>
          </div>
          <PublicationHistory />
        </section>

        <footer className="site-footer">
          <p>Unofficial HUNTER×HUNTER status tracker.</p>
          <p>Sources: Yoshihiro Togashi, Weekly Shonen Jump, VIZ.</p>
        </footer>
      </div>
    </main>
  );
}
