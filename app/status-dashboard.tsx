import { CalendarDays, ExternalLink } from "lucide-react";

import {
  formatMessage,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import englishMessages from "@/messages/en.json";
import ChapterTracker, { LocalDate } from "./chapter-tracker";
import historyData from "./data/publication-history.json";
import SectionCaptureActions from "./section-capture-actions";
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
import {
  formatDate,
  getStatusMeta,
  lowerFirst,
  type StatusMeta,
} from "./status-presentation";

type PublicationIssue = {
  year: number;
  number: number;
  released?: boolean;
  chapter?: number | string;
  date?: string;
};

type StatusMap = Record<ChapterStatus, StatusMeta>;

type LocalizedSectionProps = {
  capture?: boolean;
  locale?: Locale;
  messages?: Messages;
};

type StatusDashboardProps = {
  locale?: Locale;
  messages?: Messages;
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

export function Legend({
  messages,
  statusMeta,
}: {
  messages: Messages;
  statusMeta: StatusMap;
}) {
  return (
    <div className="legend" aria-label={messages.production.legendAria}>
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

export function PublicationHistory({
  messages,
}: {
  messages: Messages["history"];
}) {
  return (
    <div
      className="history-scroll"
      tabIndex={0}
      aria-label={messages.chartAria}
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
                  const detail = formatMessage(
                    issue.released
                      ? messages.publishedIssue
                      : messages.emptyIssue,
                    {
                      chapter: issue.chapter ?? "",
                      issue: issue.number,
                    },
                  );

                  return (
                    <span
                      className="history-cell"
                      data-released={issue.released ? "true" : "false"}
                      key={issue.year + "-" + issue.number}
                      title={detail}
                      aria-label={detail}
                      role="img"
                    />
                  );
                })}
              </div>
              <span
                className="history-count"
                aria-label={formatMessage(messages.chapterCountAria, {
                  count: publishedCount,
                })}
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

function CaptureSiteLabel() {
  return <span className="capture-site-label">hxhstatus.com</span>;
}

function ProductionCaptureActions({ messages }: { messages: Messages }) {
  return (
    <SectionCaptureActions
      fileName="hxh-production-tracker.png"
      imageUrl={"/share/production.png?v=" + lastUpdated}
      label={messages.production.title}
      messages={messages.captureActions}
    />
  );
}

export function ProductionSection({
  capture = false,
  locale = "en",
  messages = englishMessages,
}: LocalizedSectionProps) {
  const statusMeta = getStatusMeta(messages.statuses);

  return (
    <section
      className="content-section production-section"
      id="production-share-capture"
      aria-labelledby="production-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">{messages.production.eyebrow}</p>
          <h2 id="production-title">{messages.production.title}</h2>
        </div>
        {capture ? (
          <CaptureSiteLabel />
        ) : (
          <ProductionCaptureActions messages={messages} />
        )}
      </div>

      <ChapterTracker
        chapters={chapters}
        lastUpdated={lastUpdated}
        locale={locale}
        messages={messages}
      />
      <Legend messages={messages} statusMeta={statusMeta} />
    </section>
  );
}

function PublicationHistoryCaptureActions({
  messages,
}: {
  messages: Messages;
}) {
  return (
    <SectionCaptureActions
      fileName="hxh-publication-history.png"
      imageUrl={"/share/publication-history.png?v=" + lastUpdated}
      label={messages.history.title}
      messages={messages.captureActions}
    />
  );
}

export function PublicationHistorySection({
  capture = false,
  messages = englishMessages,
}: LocalizedSectionProps) {
  return (
    <section
      className="content-section history-section"
      id="publication-history-share-capture"
      aria-labelledby="history-title"
    >
      <div className="section-heading history-heading">
        <div>
          <p className="eyebrow">{messages.history.eyebrow}</p>
          <h2 id="history-title">{messages.history.title}</h2>
        </div>
        {capture ? (
          <CaptureSiteLabel />
        ) : (
          <PublicationHistoryCaptureActions messages={messages} />
        )}
      </div>

      <div className="history-key">
        <span>
          <i className="key-cell key-published" />{" "}
          {messages.history.chapterPublished}
        </span>
        <span>
          <i className="key-cell key-hiatus" /> {messages.history.noChapter}
        </span>
        <span className="history-key-count">{messages.history.countHint}</span>
      </div>
      <PublicationHistory messages={messages.history} />
    </section>
  );
}

export default function StatusDashboard({
  locale = "en",
  messages = englishMessages,
}: StatusDashboardProps = {}) {
  const nextChapterDate = nextChapter.preReleaseAt ?? nextChapter.releaseAt;
  const statusMeta = getStatusMeta(messages.statuses);
  const latestStatusLabel = statusMeta[latestUpdate.status].label;
  const latestStatus =
    locale === "en" ? lowerFirst(latestStatusLabel) : latestStatusLabel;
  const serializationLabel =
    serialization === "publishing"
      ? messages.snapshot.publishing
      : messages.snapshot.hiatus;

  return (
    <main id="top" className="site-shell" lang={locale}>
      <div className="page-frame">
        <header className="site-header">
          <a
            className="wordmark"
            href="#top"
            aria-label={messages.header.wordmarkAria}
          >
            <span className="wordmark-hxh">
              H<span className="wordmark-times">&times;</span>H
            </span>
            <span className="wordmark-status">Status</span>
          </a>
          <div className="updated-label">
            <span className="live-dot" aria-hidden="true" />
            {formatMessage(messages.header.updated, {
              date: formatDate(
                lastUpdated,
                { month: "short", day: "numeric" },
                locale,
              ),
            })}
          </div>
        </header>

        <section className="snapshot" aria-labelledby="serialization-title">
          <div className="serialization" data-state={serialization}>
            <h1 id="serialization-title">
              <span className="serialization-dot" aria-hidden="true" />
              {serializationLabel}
            </h1>
            <p className="serialization-detail">
              {formatMessage(messages.snapshot.chaptersPublished, {
                count: chaptersThisYear,
                year: currentYear,
              })}
            </p>
          </div>

          <div className="metric-grid">
            <article className="metric metric-primary">
              <span>{messages.snapshot.latestPublished}</span>
              <strong>{latestPublished.chapter}</strong>
              <small>WSJ #{latestPublished.jumpIssue}</small>
            </article>
            <article className="metric">
              <span>{messages.snapshot.nextChapter}</span>
              <strong>{nextChapter.chapter}</strong>
              <small>
                {nextChapterDate ? (
                  nextChapter.preReleaseAt ? (
                    <>
                      <span className="sr-only">
                        {messages.snapshot.estimatedPreRelease}:{" "}
                      </span>
                      <span aria-hidden="true">~ </span>
                      <LocalDate dateTime={nextChapterDate} locale={locale} />
                      <span aria-hidden="true">
                        {" - " + messages.snapshot.preReleaseSuffix}
                      </span>
                    </>
                  ) : (
                    <LocalDate dateTime={nextChapterDate} locale={locale} />
                  )
                ) : (
                  statusMeta[nextChapter.status].shortLabel
                )}
              </small>
            </article>
            <article className="metric">
              <span>{messages.snapshot.manuscriptsComplete}</span>
              <strong>{manuscriptsComplete.chapter}</strong>
              <small>{messages.snapshot.throughChapter}</small>
            </article>
            <article className="metric">
              <span>{messages.snapshot.workConfirmed}</span>
              <strong>{workConfirmed.chapter}</strong>
              <small>{messages.snapshot.throughChapter}</small>
            </article>
          </div>
        </section>

        <ProductionSection locale={locale} messages={messages} />

        <section className="latest-update" aria-labelledby="latest-update-title">
          <div className="update-date">
            <CalendarDays size={17} aria-hidden="true" />
            <span>
              {formatDate(latestUpdate.updatedAt, undefined, locale)}
            </span>
          </div>
          <div className="update-copy">
            <p className="eyebrow">{messages.latestUpdate.eyebrow}</p>
            <h2 id="latest-update-title">
              {formatMessage(messages.latestUpdate.sentence, {
                chapter: latestUpdate.chapter,
                status: latestStatus,
              })}
            </h2>
          </div>
          <a
            href={latestUpdate.source}
            className="source-link update-link"
            rel="noreferrer"
            target="_blank"
          >
            {messages.latestUpdate.viewPost}
            <ExternalLink size={15} />
          </a>
        </section>

        <PublicationHistorySection messages={messages} />

        <footer className="site-footer">
          <p>{messages.footer.disclaimer}</p>
          <p>{messages.footer.sources}</p>
        </footer>
      </div>
    </main>
  );
}
