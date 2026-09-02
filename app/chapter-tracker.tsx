"use client";

import { useRef, useState, type RefObject } from "react";
import { ExternalLink } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ChapterRecord } from "./data/status";
import { formatDate, statusMeta } from "./status-presentation";

function ChapterGrid({
  chapters,
  selectedChapter,
  onSelect,
}: {
  chapters: readonly ChapterRecord[];
  selectedChapter: number | null;
  onSelect: (chapter: ChapterRecord, trigger: HTMLButtonElement) => void;
}) {
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
            onClick={(event) => onSelect(chapter, event.currentTarget)}
            aria-label={`Chapter ${chapter.chapter}: ${meta.label}`}
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
  openerRef,
  onOpenChange,
}: {
  chapter: ChapterRecord | null;
  lastUpdated: string;
  openerRef: RefObject<HTMLButtonElement | null>;
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
              <p className="eyebrow">Chapter</p>
              <SheetTitle
                className="sheet-chapter"
                ref={titleRef}
                tabIndex={-1}
              >
                {chapter.chapter}
              </SheetTitle>
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

export default function ChapterTracker({
  chapters,
  lastUpdated,
}: {
  chapters: readonly ChapterRecord[];
  lastUpdated: string;
}) {
  const [selectedChapter, setSelectedChapter] = useState<ChapterRecord | null>(
    null,
  );
  const openerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <ChapterGrid
        chapters={chapters}
        selectedChapter={selectedChapter?.chapter ?? null}
        onSelect={(chapter, trigger) => {
          openerRef.current = trigger;
          setSelectedChapter(chapter);
        }}
      />
      <ChapterDetails
        chapter={selectedChapter}
        lastUpdated={lastUpdated}
        openerRef={openerRef}
        onOpenChange={(open) => {
          if (!open) setSelectedChapter(null);
        }}
      />
    </>
  );
}
