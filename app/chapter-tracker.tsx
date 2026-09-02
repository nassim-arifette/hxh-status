"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { ExternalLink } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatMessage,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import type { ChapterRecord } from "./data/status";
import {
  formatDate,
  formatLocalDate,
  getStatusMeta,
  type StatusMeta,
} from "./status-presentation";

const compactDateOptions = {
  month: "short",
  day: "numeric",
} satisfies Intl.DateTimeFormatOptions;

type StatusMap = Record<ChapterRecord["status"], StatusMeta>;

function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function LocalDate({
  dateTime,
  locale = "en",
}: {
  dateTime: string;
  locale?: Locale;
}) {
  const id = useId();

  return (
    <>
      <time id={id} dateTime={dateTime} suppressHydrationWarning>
        {formatLocalDate(dateTime, compactDateOptions, locale)}
      </time>
      <InlineScript
        html={`{var n=document.getElementById(${JSON.stringify(id)});if(n)n.textContent=new Intl.DateTimeFormat(${JSON.stringify(locale)},${JSON.stringify(compactDateOptions)}).format(new Date(${JSON.stringify(dateTime)}))}`}
      />
    </>
  );
}

function ChapterGrid({
  chapters,
  messages,
  selectedChapter,
  statusMeta,
  onSelect,
}: {
  chapters: readonly ChapterRecord[];
  messages: Messages;
  selectedChapter: number | null;
  statusMeta: StatusMap;
  onSelect: (chapter: ChapterRecord, trigger: HTMLButtonElement) => void;
}) {
  return (
    <div
      className="chapter-grid"
      aria-label={messages.production.chapterStatusAria}
    >
      {chapters.map((chapter) => {
        const meta = statusMeta[chapter.status];
        const StatusIcon = meta.icon;

        return (
          <button
            className="chapter-card"
            data-status={chapter.status}
            key={chapter.chapter}
            onClick={(event) => onSelect(chapter, event.currentTarget)}
            aria-label={formatMessage(messages.chapter.cardAria, {
              chapter: chapter.chapter,
              status: meta.label,
            })}
            aria-controls="chapter-details"
            aria-expanded={selectedChapter === chapter.chapter}
            aria-haspopup="dialog"
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

function ChapterDetails({
  chapter,
  lastUpdated,
  locale,
  messages,
  openerRef,
  statusMeta,
  onOpenChange,
}: {
  chapter: ChapterRecord | null;
  lastUpdated: string;
  locale: Locale;
  messages: Messages;
  openerRef: RefObject<HTMLButtonElement | null>;
  statusMeta: StatusMap;
  onOpenChange: (open: boolean) => void;
}) {
  const meta = chapter ? statusMeta[chapter.status] : statusMeta.unknown;
  const StatusIcon = meta.icon;
  const titleRef = useRef<HTMLHeadingElement>(null);

  return (
    <Sheet open={Boolean(chapter)} onOpenChange={onOpenChange}>
      <SheetContent
        className="chapter-sheet"
        id="chapter-details"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current?.focus({ preventScroll: true });
        }}
        side="right"
      >
        {chapter ? (
          <>
            <SheetHeader className="sheet-header">
              <p className="eyebrow">{messages.chapter.title}</p>
              <SheetTitle
                className="sheet-chapter"
                ref={titleRef}
                tabIndex={-1}
              >
                {chapter.chapter}
              </SheetTitle>
              <SheetDescription className="sheet-description">
                {formatMessage(messages.chapter.latestState, {
                  date: formatDate(lastUpdated, undefined, locale),
                })}
              </SheetDescription>
            </SheetHeader>

            <div className="sheet-body">
              <div className="sheet-status" data-status={chapter.status}>
                <span className="sheet-status-icon" aria-hidden="true">
                  <StatusIcon size={20} strokeWidth={2.2} />
                </span>
                <div>
                  <span className="sheet-label">{messages.chapter.status}</span>
                  <strong>{meta.label}</strong>
                </div>
              </div>

              <p className="sheet-explanation">{meta.description}</p>

              <dl className="detail-list">
                {chapter.preReleaseAt ? (
                  <div>
                    <dt>{messages.chapter.estimatedPreRelease}</dt>
                    <dd>
                      <LocalDate
                        dateTime={chapter.preReleaseAt}
                        locale={locale}
                      />
                    </dd>
                  </div>
                ) : null}
                {chapter.releaseAt ? (
                  <div>
                    <dt>
                      {chapter.status === "published"
                        ? messages.chapter.published
                        : messages.chapter.officialPublication}
                    </dt>
                    <dd>
                      <LocalDate dateTime={chapter.releaseAt} locale={locale} />
                    </dd>
                  </div>
                ) : null}
                {chapter.updatedAt ? (
                  <div>
                    <dt>{messages.chapter.update}</dt>
                    <dd>
                      {formatDate(chapter.updatedAt, undefined, locale)}
                    </dd>
                  </div>
                ) : null}
                {chapter.jumpIssue ? (
                  <div>
                    <dt>{messages.chapter.weeklyShonenJump}</dt>
                    <dd>
                      {formatMessage(messages.chapter.issue, {
                        issue: chapter.jumpIssue,
                      })}
                    </dd>
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
                  {chapter.sourceLabel ?? messages.chapter.viewSource}
                  <ExternalLink size={15} />
                </a>
              ) : (
                <p className="no-source">{messages.chapter.noSource}</p>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export default function ChapterTracker({
  chapters,
  lastUpdated,
  locale,
  messages,
}: {
  chapters: readonly ChapterRecord[];
  lastUpdated: string;
  locale: Locale;
  messages: Messages;
}) {
  const [selectedChapter, setSelectedChapter] = useState<ChapterRecord | null>(
    null,
  );
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const statusMeta = getStatusMeta(messages.statuses);

  return (
    <>
      <ChapterGrid
        chapters={chapters}
        messages={messages}
        selectedChapter={selectedChapter?.chapter ?? null}
        statusMeta={statusMeta}
        onSelect={(chapter, trigger) => {
          openerRef.current = trigger;
          setSelectedChapter(chapter);
        }}
      />
      <ChapterDetails
        chapter={selectedChapter}
        lastUpdated={lastUpdated}
        locale={locale}
        messages={messages}
        openerRef={openerRef}
        statusMeta={statusMeta}
        onOpenChange={(open) => {
          if (!open) setSelectedChapter(null);
        }}
      />
    </>
  );
}
