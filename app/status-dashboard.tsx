"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  CalendarDays,
  Check,
  CircleDashed,
  ExternalLink,
  PanelsTopLeft,
  PenLine,
  Send,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  type ChapterRecord,
  type ChapterStatus,
} from "./data/status";

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>;

type StatusMeta = {
  label: string;
  shortLabel: string;
  description: string;
  icon: Icon;
};

type PublicationIssue = {
  year: number;
  number: number;
  released?: boolean;
  chapter?: number | string;
  date?: string;
};

const statusMeta: Record<ChapterStatus, StatusMeta> = {
  published: {
    label: "Published",
    shortLabel: "Published",
    description: "Officially released to readers.",
    icon: Check,
  },
  scheduled: {
    label: "Scheduled for publication",
    shortLabel: "Scheduled",
    description: "Jump has scheduled this chapter for publication.",
    icon: CalendarDays,
  },
  delivered: {
    label: "Delivered to Jump",
    shortLabel: "At Jump",
    description:
      "The finished manuscript has been delivered to Jump, but it is not published yet.",
    icon: Send,
  },
  background: {
    label: "Background specifications complete",
    shortLabel: "Backgrounds",
    description:
      "Instructions for backgrounds and supporting production work are complete.",
    icon: PanelsTopLeft,
  },
  inking: {
    label: "Character inking complete",
    shortLabel: "Inked",
    description:
      "Character linework is complete; later production steps remain.",
    icon: PenLine,
  },
  unknown: {
    label: "No confirmed production update",
    shortLabel: "Unknown",
    description: "No precise public production milestone has been confirmed.",
    icon: CircleDashed,
  },
};

const issues = historyData as PublicationIssue[];

const currentYear = issues.reduce((latest, issue) => Math.max(latest, issue.year), 0);

const chaptersThisYear = issues.filter(
  (issue) => issue.year === currentYear && issue.released,
).length;

const serializationHeadline = {
  publishing: "Serializing",
  hiatus: "On hiatus",
} as const;

// Status labels read as sentence fragments after "Chapter 427 …", but only the
// first letter may drop case: "Delivered to Jump" has to keep its capital J.
function lowerFirst(label: string) {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function formatDate(date?: string, options?: Intl.DateTimeFormatOptions) {
  if (!date) return "Not confirmed";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}

function ChapterGrid({ onSelect }: { onSelect: (chapter: ChapterRecord) => void }) {
  return (
    <div className="chapter-grid" aria-label="Chapter production status">
      {chapters.map((chapter) => {
        const meta = statusMeta[chapter.status];
        const StatusIcon = meta.icon;

        return (
          <button
            className="chapter-card"
            data-status={chapter.status}
            key={chapter.chapter}
            onClick={() => onSelect(chapter)}
            aria-label={`Chapter ${chapter.chapter}: ${meta.label}`}
            type="button"
          >
            <span className="chapter-number">{chapter.chapter}</span>
            <span className="chapter-status-icon" aria-hidden="true">
              <StatusIcon size={16} strokeWidth={2.2} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
  const byYear = useMemo(() => {
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
  }, []);

  return (
    <div className="history-scroll" tabIndex={0} aria-label="Publication history chart">
      <div className="history-chart">
        {byYear.map(({ year, issues: yearIssues }) => {
          const publishedCount = yearIssues.filter((issue) => issue.released).length;

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
              <span className="history-count" aria-label={`${publishedCount} chapters`}>
                {String(publishedCount).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChapterDetails({
  chapter,
  onOpenChange,
}: {
  chapter: ChapterRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const meta = chapter ? statusMeta[chapter.status] : statusMeta.unknown;
  const StatusIcon = meta.icon;

  return (
    <Sheet open={Boolean(chapter)} onOpenChange={onOpenChange}>
      <SheetContent className="chapter-sheet" side="right">
        {chapter ? (
          <>
            <SheetHeader className="sheet-header">
              <p className="eyebrow">Chapter</p>
              <SheetTitle className="sheet-chapter">{chapter.chapter}</SheetTitle>
              <SheetDescription className="sheet-description">
                Latest confirmed state as of {formatDate(lastUpdated)}.
              </SheetDescription>
            </SheetHeader>

            <div className="sheet-body">
              <div className="sheet-status" data-status={chapter.status}>
                <span className="sheet-status-icon" aria-hidden="true">
                  <StatusIcon size={20} strokeWidth={2.2} />
                </span>
                <div>
                  <span className="sheet-label">Status</span>
                  <strong>{meta.label}</strong>
                </div>
              </div>

              <p className="sheet-explanation">{meta.description}</p>

              <dl className="detail-list">
                {chapter.publishedAt ? (
                  <div>
                    <dt>Published</dt>
                    <dd>{formatDate(chapter.publishedAt)}</dd>
                  </div>
                ) : null}
                {chapter.updatedAt ? (
                  <div>
                    <dt>Update</dt>
                    <dd>{formatDate(chapter.updatedAt)}</dd>
                  </div>
                ) : null}
                {chapter.jumpIssue ? (
                  <div>
                    <dt>Weekly Shonen Jump</dt>
                    <dd>Issue {chapter.jumpIssue}</dd>
                  </div>
                ) : null}
              </dl>

              {chapter.note ? <p className="sheet-note">{chapter.note}</p> : null}

              {chapter.source ? (
                <a
                  className="source-link"
                  href={chapter.source}
                  rel="noreferrer"
                  target="_blank"
                >
                  {chapter.sourceLabel ?? "View source"}
                  <ExternalLink size={15} />
                </a>
              ) : (
                <p className="no-source">No chapter-specific source yet.</p>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export default function StatusDashboard() {
  const [selectedChapter, setSelectedChapter] = useState<ChapterRecord | null>(null);

  return (
    <main id="top" className="site-shell">
      <div className="page-frame">
        <header className="site-header">
          <a className="wordmark" href="#top" aria-label="HxH Status home">
            <span className="wordmark-hxh">H<span className="wordmark-times">×</span>H</span>
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

        <section className="content-section production-section" aria-labelledby="production-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Kakin Succession Contest</p>
              <h2 id="production-title">Production tracker</h2>
            </div>
          </div>

          <ChapterGrid onSelect={setSelectedChapter} />
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

        <section className="content-section history-section" aria-labelledby="history-title">
          <div className="section-heading history-heading">
            <div>
              <p className="eyebrow">1998–2026</p>
              <h2 id="history-title">Publication history</h2>
            </div>
          </div>

          <div className="history-key">
            <span><i className="key-cell key-published" /> Chapter published</span>
            <span><i className="key-cell key-hiatus" /> No chapter</span>
            <span className="history-key-count">right column: chapters / year</span>
          </div>
          <PublicationHistory />
        </section>

        <footer className="site-footer">
          <p>Unofficial HUNTER×HUNTER status tracker.</p>
          <p>Sources: Yoshihiro Togashi, Weekly Shonen Jump, VIZ.</p>
        </footer>
      </div>

      <ChapterDetails
        chapter={selectedChapter}
        onOpenChange={(open) => {
          if (!open) setSelectedChapter(null);
        }}
      />
    </main>
  );
}
