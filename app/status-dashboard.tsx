import Image from "next/image";

import waitArt from "./assets/as-long-as-it-takes.webp";
import { gameCopy } from "./game-copy";
import { SiteNavigation } from "./site-navigation";
import {
  formatMessage,
  getLocaleDirection,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import englishMessages from "@/messages/en.json";
import ChapterTracker from "./chapter-tracker";
import Faq from "./faq";
import historyData from "./data/publication-history.json";
import togashiArchive from "./data/togashi-posts.json";
import { deriveProductionForecast } from "./data/production-forecast";
import { japanDate } from "./data/release-forecast";
import LanguageSwitcher from "./language-switcher";
import LatestTogashiUpdate from "./latest-togashi-update";
import PushNotificationControl from "./push-notification-control";
import SectionCaptureActions from "./section-capture-actions";
import ThemeToggle from "./theme-toggle";
import { ARCS } from "./data/arcs";
import { chapterPageNumbers } from "./data/chapter-pages";
import { arcStats, buildStatusSentences, hiatusStats } from "./data/summary";
import { HiatusStatistics } from "./hiatus-statistics";
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
import {
  comicSeriesLd,
  datasetLd,
  graph,
  GITHUB_REPOSITORY,
  JsonLd,
  publisherLd,
  webSiteLd,
} from "./structured-data";
import {
  ARC_PAGES,
  arcPath,
  chapterPath,
  contentPagePath,
  CONTENT_PAGES,
  localePath,
} from "@/lib/routes";

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

const arcSummary = arcStats;
const hiatusStatsSummary = hiatusStats;

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
        messages={{ chapter: messages.chapter, production: messages.production, statuses: messages.statuses }}
        pageHrefs={Object.fromEntries(
          chapterPageNumbers.map((number) => [number, localePath(chapterPath(number), locale)]),
        )}
        titles={getChapterTitlesFor(
          locale,
          chapters.map((chapter) => chapter.chapter),
        )}
      />
      <Legend messages={messages} />
      {capture ? null : (
        <>
          <p className="section-note">{messages.production.selectHint}</p>
          {/* The tiles open a sheet; these are the same chapters as plain
              links, so every chapter page is one step from the home page. */}
          <nav className="chapter-index" aria-label={messages.production.chapterPages}>
            <span>{messages.production.chapterPages}</span>
            <ul>
              {chapterPageNumbers.map((number) => (
                <li key={number}>
                  <a
                    href={localePath(chapterPath(number), locale)}
                    aria-label={formatMessage(messages.chapter.pageLink, { chapter: number })}
                  >
                    {number}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
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
        years={historyYears}
        arcIds={arcIds}
        titles={getChapterTitles(locale)}
        arcSummary={arcSummary}
      />
    </section>
  );
}

export function HiatusStatisticsSection({
  messages = englishMessages,
}: LocalizedSectionProps) {
  return (
    <section
      className="content-section stats-section"
      aria-labelledby="stats-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">{messages.stats.eyebrow}</p>
          <h2 id="stats-title">{messages.stats.title}</h2>
        </div>
      </div>
      <p className="section-lede">{messages.stats.subtitle}</p>
      <HiatusStatistics
        summary={hiatusStatsSummary}
        messages={messages.stats}
      />
    </section>
  );
}

export default function StatusDashboard({
  locale = "en",
  messages = englishMessages,
}: StatusDashboardProps = {}) {
  const statusMeta = getStatusMeta(messages.statuses);
  const prediction = publicationStatus === "hiatus" && !nextChapter.releaseAt && !["scheduled", "published"].includes(nextChapter.status)
    ? deriveProductionForecast({ records: hiatusStats.historicalHiatuses.completed, posts: togashiArchive.posts, chapter: nextChapter.chapter, asOf: japanDate() })
    : null;
  const predictionMonth = prediction
    ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(prediction.medianDate))
    : null;
  const summarySentences = buildStatusSentences(locale, messages);
  const publicationStatusLabel =
    publicationStatus === "publishing"
      ? messages.snapshot.publishing
      : messages.snapshot.hiatus;

  return (
    <main
      id="top"
      className="site-shell home"
      dir={getLocaleDirection(locale)}
      lang={locale}
    >
      <div className="page-frame">
        <header className="site-header">
          <a
            className="wordmark"
            href="#top"
          >
            <span className="wordmark-hxh">
              H<span className="wordmark-times">&times;</span>H
            </span>
            {" "}
            <span className="wordmark-status">Status</span>
          </a>
          <SiteNavigation locale={locale} messages={messages} />
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
            <ThemeToggle label={messages.header.darkMode} />
            <LanguageSwitcher
              label={messages.language.label}
              locale={locale}
            />
          </div>
        </header>

        <section
          className="home-hero"
          data-state={publicationStatus}
          aria-labelledby="publishing-status-title"
        >
          <div className="home-hero-copy">
            {/* The heading carries the question readers type and the answer
                they came for, in that order, so the page states its subject in
                words rather than leaving it to a coloured dot. */}
            <h1 id="publishing-status-title">
              <span className="home-hero-question">
                {messages.snapshot.question}
              </span>
              <span className="home-hero-answer">{publicationStatusLabel}</span>
            </h1>

            {publicationStatus === "hiatus" ? (
              <a className="home-hero-count" href={localePath("/hiatus", locale)}>
                <strong
                  suppressHydrationWarning
                  data-elapsed-since={hiatusStats.currentHiatus.sinceDate}
                  data-days-template="{days}"
                >
                  {hiatusStats.currentHiatus.elapsedDays}
                </strong>
                <span>
                  {formatMessage(messages.snapshot.daysSince, {
                    chapter: latestPublished.chapter,
                  })}
                </span>
              </a>
            ) : (
              <p className="home-hero-detail">
                {formatMessage(messages.snapshot.chaptersPublished, {
                  count: chaptersThisYear,
                  year: currentYear,
                })}
              </p>
            )}


            {/* Alerts are what bring readers back when Togashi posts, so they
                sit with the answer rather than among the header controls. */}
            <div className="home-hero-alerts">
              <p>{messages.notifications.description}</p>
              <PushNotificationControl
                locale={locale}
                messages={messages.notifications}
              />
            </div>
          </div>

          {publicationStatus === "publishing" ? (
            // While the series runs, the next release date is the answer
            // readers come back for; it takes the place of the panel.
            <div className="home-hero-next">
              <span>
                {messages.snapshot.nextChapter} {nextChapter.chapter}
              </span>
              <strong>
                {nextChapter.releaseAt ? (
                  <time dateTime={nextChapter.releaseAt.slice(0, 10)} title={messages.snapshot.japanDate}>
                    {formatDate(nextChapter.releaseAt.slice(0, 10), { month: "long", day: "numeric", year: undefined }, locale)}
                  </time>
                ) : (
                  statusMeta[nextChapter.status].shortLabel
                )}
              </strong>
              <small>
                {nextChapter.releaseAt ? "JST" : messages.snapshot.noOfficialDate}
              </small>
            </div>
          ) : null}

          {publicationStatus === "hiatus" ? (
            <figure className="home-hero-art">
              <Image
                src={waitArt}
                alt={messages.snapshot.waitArtAlt}
                priority
                unoptimized
                sizes="(max-width: 720px) 76vw, 430px"
              />
            </figure>
          ) : null}
        </section>

        <dl className="home-facts">
          <div className="home-fact">
            <dt>{messages.snapshot.latestPublished}</dt>
            <dd className="home-fact-number">{latestPublished.chapter}</dd>
            <dd className="home-fact-note">
              {latestPublished.jumpIssue ? `WSJ #${latestPublished.jumpIssue}` : ""}
              {latestPublished.releaseAt ? (
                <>
                  {latestPublished.jumpIssue ? ", " : ""}
                  <time dateTime={latestPublished.releaseAt.slice(0, 10)} title={messages.snapshot.japanDate}>
                    {formatDate(latestPublished.releaseAt.slice(0, 10), { month: "short", day: "numeric", year: undefined }, locale)} JST
                  </time>
                </>
              ) : null}
            </dd>
          </div>
          <div className="home-fact">
            <dt>{messages.snapshot.nextChapter}</dt>
            <dd className="home-fact-number">{nextChapter.chapter}</dd>
            <dd className="home-fact-note">
              {nextChapter.releaseAt ? (
                <time dateTime={nextChapter.releaseAt.slice(0, 10)} title={messages.snapshot.japanDate}>
                  {formatDate(nextChapter.releaseAt.slice(0, 10), { month: "short", day: "numeric", year: undefined }, locale)} JST
                </time>
              ) : (
                <>
                  <span>{statusMeta[nextChapter.status].label}</span>
                  <span>{messages.snapshot.noOfficialDate}</span>
                </>
              )}
            </dd>
          </div>
          <div className="home-fact">
            <dt>
              {messages.snapshot.manuscriptsComplete}
              <span>{messages.snapshot.throughChapter}</span>
            </dt>
            <dd className="home-fact-number">{manuscriptsComplete.chapter}</dd>
          </div>
          <div className="home-fact">
            <dt>
              {messages.snapshot.workConfirmed}
              <span>{messages.snapshot.throughChapter}</span>
            </dt>
            <dd className="home-fact-number">{workConfirmed.chapter}</dd>
          </div>
        </dl>

        {/* Jump links to the parts readers come back for. The production
            section keeps its capture id, so its anchor is a wrapper. */}
        <nav className="home-jump" aria-label={messages.nav.onThisPage}>
          <a href="#production">{messages.production.title}</a>
          <a href="#next-chapter">{messages.snapshot.nextChapter}</a>
          <a href="#latest-togashi-update">{messages.latestUpdate.eyebrow}</a>
          <a href="#faq">{messages.faq.title}</a>
        </nav>

        <div id="production">
          <ProductionSection locale={locale} messages={messages} />
        </div>

        <section id="next-chapter" className="home-next" aria-labelledby="next-chapter-title">
          <div className="home-next-model">
            <h2 id="next-chapter-title">
              {formatMessage(prediction ? messages.forecast.title : messages.baseRates.eyebrow, { chapter: nextChapter.chapter })}
            </h2>
            {predictionMonth && (
              <p className="home-next-estimate">
                {formatMessage(messages.forecast.homePrediction, { date: predictionMonth })}
              </p>
            )}
            {/* The estimate is labelled unofficial in its own sentence; the
                caveats and method live on the chapter page linked below. */}
            {prediction ? null : <p className="home-next-caution">{summarySentences[2]}</p>}
            <a className="home-text-link" href={localePath(chapterPath(nextChapter.chapter), locale)}>
              {formatMessage(messages.baseRates.forecastLink, { chapter: nextChapter.chapter })}
            </a>
          </div>
          <div className="home-next-game">
            <p>{gameCopy(locale).home}</p>
            {/* The catalog CTA ends in an arrow for inline use; the button
                shape already says it is an action. */}
            <a className="home-button" href={localePath("/predictions", locale)}>
              {gameCopy(locale).cta.replace(/\s*[→←]\s*$/u, "")}
            </a>
          </div>
        </section>
        <LatestTogashiUpdate
          locale={locale}
          messages={messages.latestUpdate}
          permalinkLabel={messages.pages.updates.readMore}
        />

        <section className="home-explore" aria-label={messages.nav.explore}>
          <a href={localePath("/history", locale)}><strong>{messages.history.title}</strong><span>{messages.history.intro}</span></a>
          <a href={localePath("/statistics", locale)}><strong>{messages.pages.statistics.name}</strong><span>{messages.pages.statistics.lede}</span></a>
        </section>

        <Faq locale={locale} messages={messages} />

        {/* One page cannot rank for every question the data answers, so each
            answer gets its own URL and the tracker links to all of them. */}
        <nav aria-label={messages.nav.explore} className="page-links">
          <p className="eyebrow">{messages.nav.explore}</p>
          <ul>
            {CONTENT_PAGES.map((page) => (
              <li key={page}>
                <a href={localePath(contentPagePath(page), locale)}>
                  {contentPageNames(messages)[page]}
                </a>
              </li>
            ))}
            {ARC_PAGES.map((arc) => (
              <li key={arc}>
                <a href={localePath(arcPath(arc), locale)}>
                  {messages.pages.arc.name}
                </a>
              </li>
            ))}
            <li>
              <a href={localePath(chapterPath(nextChapter.chapter), locale)}>
                {formatMessage(messages.pages.chapter.h1, {
                  chapter: nextChapter.chapter,
                })}
              </a>
            </li>
          </ul>
        </nav>

        <footer className="site-footer">
          <p>{messages.footer.disclaimer}</p>
          <div className="footer-details">
            <p>{messages.footer.sources}</p>
            <a
              className="footer-github"
              href={GITHUB_REPOSITORY}
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

      <JsonLd
        data={graph(
          publisherLd(messages.metadata.siteName),
          webSiteLd({
            siteName: messages.metadata.siteName,
            description: messages.metadata.description,
            locale,
          }),
          comicSeriesLd({
            locale,
            description: summarySentences.join(" "),
            numberOfItems: latestPublished.chapter,
            startDate: "1998-03-16",
          }),
          datasetLd({
            name: messages.metadata.title,
            description: messages.metadata.description,
            locale,
            modified: lastUpdated,
            temporalCoverage: "1998-03/..",
          }),
        )}
      />
    </main>
  );
}

// The label each cross-link carries. Kept beside the nav that uses it so a new
// content page is one entry in two places rather than a search through the file.
function contentPageNames(messages: Messages): Record<string, string> {
  return {
    history: messages.nav.history,
    predictions: messages.nav.predictions,
    hiatus: messages.pages.hiatus.name,
    statistics: messages.pages.statistics.name,
    updates: messages.pages.updates.name,
    "where-to-read": messages.pages.whereToRead.name,
    about: messages.pages.about.name,
    api: messages.pages.api.name,
  };
}
