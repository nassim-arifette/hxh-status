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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatMessage,
  getLocaleDirection,
  getOfficialReaders,
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
import {
  getChapterTitle,
  getVolumeLabel,
  CHAPTER_TITLE_LABEL,
  VOLUME_LABEL,
} from "./data/chapter-titles";

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
  showTime = false,
}: {
  dateTime: string;
  locale?: Locale;
  showTime?: boolean;
}) {
  const id = useId();
  const timeOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const separator = locale === "ar" ? "، " : locale === "ja" || locale === "zh" ? " " : ", ";
  const dateLabel = formatLocalDate(dateTime, compactDateOptions, locale);
  const label = showTime
    ? `${formatLocalDate(dateTime, timeOptions, locale)}${separator}${dateLabel}`
    : dateLabel;

  return (
    <>
      <time id={id} dateTime={dateTime} suppressHydrationWarning>
        {label}
      </time>
      <InlineScript
        html={`{var n=document.getElementById(${JSON.stringify(id)});if(n){var d=new Date(${JSON.stringify(dateTime)});n.textContent=${showTime ? `new Intl.DateTimeFormat(${JSON.stringify(locale)},${JSON.stringify(timeOptions)}).format(d)+${JSON.stringify(separator)}+` : ""}new Intl.DateTimeFormat(${JSON.stringify(locale)},${JSON.stringify(compactDateOptions)}).format(d)}}`}
      />
    </>
  );
}

function ChapterGrid({
  chapters,
  locale = "en",
  messages,
  selectedChapter,
  statusMeta,
  onSelect,
}: {
  chapters: readonly ChapterRecord[];
  locale?: Locale;
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
        const title = getChapterTitle(chapter.chapter, locale);
        const volume = getVolumeLabel(chapter.chapter, locale);

        return (
          <Tooltip key={chapter.chapter}>
            <TooltipTrigger asChild>
              <button
                className="chapter-card"
                data-status={chapter.status}
                onClick={(event) => onSelect(chapter, event.currentTarget)}
                aria-label={
                  title
                    ? `${formatMessage(messages.chapter.cardAria, {
                        chapter: chapter.chapter,
                        status: meta.label,
                      })} - ${title}`
                    : formatMessage(messages.chapter.cardAria, {
                        chapter: chapter.chapter,
                        status: meta.label,
                      })
                }
                aria-controls="chapter-details"
                aria-expanded={selectedChapter === chapter.chapter}
                aria-haspopup="dialog"
                type="button"
              >
                <span className="chapter-number">{chapter.chapter}</span>
                <span className="chapter-status-icon" aria-hidden="true">
                  <StatusIcon size={14} strokeWidth={2.2} />
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              className="chapter-tooltip-content"
            >
              <div className="chapter-tooltip-head">
                <span>
                  {messages.chapter.title} {chapter.chapter}
                </span>
                {title ? (
                  <span className="chapter-tooltip-title">• {title}</span>
                ) : (
                  <span className="chapter-tooltip-title">• {volume}</span>
                )}
              </div>
              <div className="chapter-tooltip-sub">
                <span>{meta.label}</span>
                {chapter.releaseAt ? (
                  <span>
                    • <LocalDate dateTime={chapter.releaseAt} locale={locale} showTime={chapter.status === "scheduled"} />
                  </span>
                ) : null}
                {chapter.jumpIssue ? (
                  <span>
                    •{" "}
                    {formatMessage(messages.chapter.issue, {
                      issue: chapter.jumpIssue,
                    })}
                  </span>
                ) : null}
              </div>
            </TooltipContent>
          </Tooltip>
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
  const chapterTitle = chapter ? getChapterTitle(chapter.chapter, locale) : undefined;
  const volume = chapter ? getVolumeLabel(chapter.chapter, locale) : undefined;

  const sources = chapter
    ? chapter.sourceType === "official-reader"
      ? getOfficialReaders(locale, chapter.chapter)
      : chapter.source
        ? [
            {
              href: chapter.source,
              label:
                chapter.sourceType === "togashi-x"
                  ? messages.chapter.togashiSource
                  : (chapter.sourceLabel ?? messages.chapter.viewSource),
            },
          ]
        : []
    : [];

  return (
    <Sheet open={Boolean(chapter)} onOpenChange={onOpenChange}>
      <SheetContent
        className="chapter-sheet"
        closeLabel={messages.chapter.close}
        dir={getLocaleDirection(locale)}
        id="chapter-details"
        lang={locale}
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
              <p className="eyebrow">
                {volume ? `${volume} • ` : ""}
                {messages.chapter.title}
              </p>
              <SheetTitle
                className="sheet-chapter"
                ref={titleRef}
                tabIndex={-1}
              >
                <span>{chapter.chapter}</span>
                {chapterTitle ? (
                  <span className="sheet-chapter-name"> : {chapterTitle}</span>
                ) : null}
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
                {chapterTitle ? (
                  <div>
                    <dt>{CHAPTER_TITLE_LABEL[locale] ?? CHAPTER_TITLE_LABEL.en}</dt>
                    <dd>{chapterTitle}</dd>
                  </div>
                ) : null}
                {volume ? (
                  <div>
                    <dt>{VOLUME_LABEL[locale] ?? VOLUME_LABEL.en}</dt>
                    <dd>{volume}</dd>
                  </div>
                ) : null}
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
                      <LocalDate dateTime={chapter.releaseAt} locale={locale} showTime={chapter.status === "scheduled"} />
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

              {sources.length > 0 ? (
                <div
                  className="source-links"
                  aria-label={messages.chapter.viewSource}
                >
                  {sources.map((source) => (
                    <a
                      className="source-link"
                      href={source.href}
                      key={source.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {source.label}
                      <ExternalLink size={15} />
                    </a>
                  ))}
                </div>
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
        locale={locale}
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
