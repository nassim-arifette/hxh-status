import {
  formatMessage,
  getLocaleDirection,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import englishMessages from "@/messages/en.json";
import ChapterTracker, { LocalDate } from "./chapter-tracker";
import Faq from "./faq";
import historyData from "./data/publication-history.json";
import statusData from "./data/status-data.json";
import LanguageSwitcher from "./language-switcher";
import LatestTogashiUpdate from "./latest-togashi-update";
import PushNotificationControl from "./push-notification-control";
import SectionCaptureActions from "./section-capture-actions";
import { ARCS, deriveArcStats } from "./data/arcs";
import { deriveHiatusStats } from "./data/hiatus-stats";
import { getChapterTitles, getChapterTitlesFor } from "./data/chapter-titles";
import type { HistoryYear } from "./publication-history";
import {
  chapters,
  lastUpdated,
  latestPublished,
  manuscriptsComplete,
  nextChapter,
  publicationStatus,
  statusDataRevision,
  workConfirmed,
  type ChapterStatus,
} from "./data/status";
import {
  formatDate,
  getStatusMeta,
  type StatusMeta,
} from "./status-presentation";

// Bump when capture-only styles change; data updates already bump lastUpdated.
const shareImageRevision = "2";

type PublicationIssue = {
  year: number;
  number: number;
  released?: boolean;
  chapter?: number | string;
  date?: string;
  arc?: string;
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

// The chart is grouped, sorted and compacted here so the browser receives
// neither the raw dataset nor the work of rebuilding it. Arc ids repeat 422
// times across the cells, so they are sent once as a table and referenced by
// index.
const arcIds = [...new Set(issues.map((issue) => issue.arc).filter(Boolean))] as string[];
const arcIndex = new Map(arcIds.map((id, index) => [id, index]));

const historyYears: HistoryYear[] = [
  ...issues
    .reduce((grouped, issue) => {
      const year = grouped.get(issue.year) ?? [];
      year.push(issue);
      grouped.set(issue.year, year);
      return grouped;
    }, new Map<number, PublicationIssue[]>())
    .entries(),
]
  .sort(([a], [b]) => b - a)
  .map(([year, yearIssues]) => [
    year,
    [...yearIssues]
      .sort((a, b) => a.number - b.number)
      .map((issue) =>
        issue.released
          ? ([
              issue.number,
              Number(issue.chapter ?? 0),
              arcIndex.get(issue.arc ?? "") ?? -1,
            ] as const)
          : issue.number,
      ),
  ]);

const arcSummary = deriveArcStats(issues);
const hiatusStatsSummary = deriveHiatusStats(issues, statusData);

const currentYear = issues.reduce(
  (latest, issue) => Math.max(latest, issue.year),
  0,
);

const chaptersThisYear = issues.filter(
  (issue) => issue.year === currentYear && issue.released,
).length;

import { Legend } from "./status-legend";
import { PublicationHistory } from "./publication-history";

export { Legend, PublicationHistory };
export type { StatusMap };

function CaptureSiteLabel() {
  return <span className="capture-site-label">hxhstatus.com</span>;
}

function ProductionCaptureActions({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  return (
    <SectionCaptureActions
      fileName={`hxh-production-tracker-${locale}.png`}
      imageUrl={`/share/${locale}/production.png?v=${statusDataRevision}-${shareImageRevision}`}
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
          <ProductionCaptureActions locale={locale} messages={messages} />
        )}
      </div>

      <ChapterTracker
        chapters={chapters}
        lastUpdated={lastUpdated}
        locale={locale}
        messages={messages}
        titles={getChapterTitlesFor(
          locale,
          chapters.map((chapter) => chapter.chapter),
        )}
      />
      <Legend messages={messages} />
    </section>
  );
}

function PublicationHistoryCaptureActions({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  return (
    <SectionCaptureActions
      fileName={`hxh-publication-history-${locale}.png`}
      imageUrl={`/share/${locale}/publication-history.png?v=${statusDataRevision}-${shareImageRevision}`}
      label={messages.history.title}
      messages={messages.captureActions}
    />
  );
}

export function PublicationHistorySection({
  capture = false,
  locale = "en",
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
          <PublicationHistoryCaptureActions
            locale={locale}
            messages={messages}
          />
        )}
      </div>

      <div className="history-key history-key-arcs">
        <div className="history-arcs-legend">
          {ARCS.map((arc) => (
            <span key={arc.id} className="history-arc-legend-item">
              <i
                className="key-cell"
                style={{ backgroundColor: arc.color, borderColor: arc.color }}
              />
              <span>{arc.name[locale] ?? arc.name.en}</span>
            </span>
          ))}
          <span className="history-arc-legend-item">
            <i className="key-cell key-hiatus" />
            <span>{messages.history.noChapter}</span>
          </span>
        </div>
        <span className="history-key-count">{messages.history.countHint}</span>
      </div>
      <PublicationHistory
        capture={capture}
        locale={locale}
        messages={messages.history}
        statsMessages={messages.stats}
        years={historyYears}
        arcIds={arcIds}
        titles={getChapterTitles(locale)}
        arcSummary={arcSummary}
        hiatusStats={hiatusStatsSummary}
      />
    </section>
  );
}

export default function StatusDashboard({
  locale = "en",
  messages = englishMessages,
}: StatusDashboardProps = {}) {
  const statusMeta = getStatusMeta(messages.statuses);
  const publicationStatusLabel =
    publicationStatus === "publishing"
      ? messages.snapshot.publishing
      : messages.snapshot.hiatus;

  return (
    <main
      id="top"
      className="site-shell"
      dir={getLocaleDirection(locale)}
      lang={locale}
    >
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
          <div className="header-meta">
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
            <PushNotificationControl
              locale={locale}
              messages={messages.notifications}
            />
            <LanguageSwitcher
              label={messages.language.label}
              locale={locale}
            />
          </div>
        </header>

        <section className="snapshot" aria-labelledby="publishing-status-title">
          <div className="publishing-status" data-state={publicationStatus}>
            <h1 id="publishing-status-title">
              <span className="publishing-status-dot" aria-hidden="true" />
              {publicationStatusLabel}
            </h1>
            <p className="publishing-status-detail">
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
              <small>
                {latestPublished.jumpIssue ? `WSJ #${latestPublished.jumpIssue}` : ""}
                {latestPublished.releaseAt ? (
                  <>
                    {latestPublished.jumpIssue ? " • " : ""}
                    <LocalDate dateTime={latestPublished.releaseAt} locale={locale} />
                  </>
                ) : null}
              </small>
            </article>
            <article className="metric">
              <span>{messages.snapshot.nextChapter}</span>
              <strong>{nextChapter.chapter}</strong>
              <small>
                {nextChapter.releaseAt ? (
                  <LocalDate dateTime={nextChapter.releaseAt} locale={locale} showTime />
                ) : (
                  statusMeta[nextChapter.status].shortLabel
                )}
              </small>
            </article>
            <article className="metric">
              <span>{messages.snapshot.manuscriptsComplete}</span>
              <strong>{manuscriptsComplete.chapter}</strong>
            </article>
            <article className="metric">
              <span>{messages.snapshot.workConfirmed}</span>
              <strong>{workConfirmed.chapter}</strong>
            </article>
          </div>
        </section>

        <ProductionSection locale={locale} messages={messages} />

        <LatestTogashiUpdate locale={locale} messages={messages.latestUpdate} />

        <PublicationHistorySection locale={locale} messages={messages} />

        <Faq locale={locale} messages={messages} />

        <footer className="site-footer">
          <p>{messages.footer.disclaimer}</p>
          <div className="footer-details">
            <p>{messages.footer.sources}</p>
            <a
              className="footer-github"
              href="https://github.com/nassim-arifette/hxh-status"
              rel="noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                height="14"
                viewBox="0 0 24 24"
                width="14"
              >
                <path
                  d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z"
                  fill="currentColor"
                />
              </svg>
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
