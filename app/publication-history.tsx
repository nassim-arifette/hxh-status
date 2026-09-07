"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import {
  getArcDefinition,
  formatArcYears,
  formatArcDuration,
  type ArcComparisonSummary,
} from "./data/arcs";
import type { ChapterTitles } from "./data/chapter-titles";

type ActiveCellInfo = {
  year: number;
  issue: number;
  released: boolean;
  chapter?: number | string;
  arc?: string;
  rawX: number;
  x: number;
  y: number;
  isTopRow: boolean;
};

function getClampedX(
  rawX: number,
  tooltipWidth: number,
  chart: HTMLElement,
): number {
  const scrollContainer = chart.parentElement;
  const halfWidth = tooltipWidth / 2;
  const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
  const viewportWidth = scrollContainer
    ? scrollContainer.clientWidth
    : chart.clientWidth;

  const PADDING = 12;

  if (viewportWidth < tooltipWidth + PADDING * 2) {
    return scrollLeft + viewportWidth / 2;
  }

  const minX = scrollLeft + halfWidth + PADDING;
  const maxX = scrollLeft + viewportWidth - halfWidth - PADDING;
  return Math.max(minX, Math.min(rawX, maxX));
}

// The server sends the chart already grouped and sorted, in a shape that
// costs a fraction of the raw dataset to serialise: a released issue is
// [issue, chapter, arcIndex] and an issue that carried no chapter is just its
// number. Importing the dataset here instead would put all 1370 rows, and
// every field of them, into the browser bundle.
export type HistoryCell = number | readonly [number, number, number];
export type HistoryYear = readonly [year: number, cells: readonly HistoryCell[]];

function ArcComparison({
  summary,
  locale = "en",
  messages,
}: {
  summary: ArcComparisonSummary;
  locale?: Locale;
  messages: Messages["history"];
}) {
  const [metric, setMetric] = useState<"chapters" | "duration">("chapters");

  const sortedArcs = useMemo(() => {
    return [...summary.arcs].sort((a, b) => {
      if (metric === "chapters") {
        return b.chapterCount - a.chapterCount;
      }
      return b.spanIssues - a.spanIssues;
    });
  }, [summary.arcs, metric]);

  const currentArc = summary.currentArc;

  return (
    <section
      className="arc-comparison"
      aria-labelledby="arc-comparison-heading"
    >
      <div className="arc-comparison-header">
        <div>
          <h3 id="arc-comparison-heading" className="arc-comparison-title">
            {messages.arcComparison}
          </h3>
          <p className="arc-comparison-subtitle">
            {messages.arcComparisonSubtitle}
          </p>
        </div>

        <div
          className="arc-comparison-switch"
          role="tablist"
          aria-label={messages.arcComparison}
        >
          <button
            type="button"
            role="tab"
            id="tab-metric-chapters"
            aria-selected={metric === "chapters"}
            aria-controls="arc-comparison-list"
            className={`arc-comparison-tab ${metric === "chapters" ? "is-active" : ""}`}
            onClick={() => setMetric("chapters")}
          >
            {messages.metricChapters}
          </button>
          <button
            type="button"
            role="tab"
            id="tab-metric-duration"
            aria-selected={metric === "duration"}
            aria-controls="arc-comparison-list"
            className={`arc-comparison-tab ${metric === "duration" ? "is-active" : ""}`}
            onClick={() => setMetric("duration")}
          >
            {messages.metricDuration}
          </button>
        </div>
      </div>

      <div className="arc-current-banner">
        <div className="arc-current-header">
          <div className="arc-current-name-wrapper">
            <span className="arc-badge-current">{messages.currentArcBadge}</span>
            <strong className="arc-current-name">
              {currentArc.name[locale] ?? currentArc.name.en}
            </strong>
          </div>
          <span className="arc-current-span">
            {currentArc.startChapter && currentArc.endChapter
              ? `Ch. ${currentArc.startChapter}–${currentArc.endChapter} · `
              : ""}
            {formatArcYears(currentArc, locale)}
          </span>
        </div>

        <div className="arc-current-stats">
          <div className="arc-current-stat-item">
            <span className="arc-current-stat-pill">
              {formatMessage(messages.rankChapters, {
                rank: currentArc.chapterRank,
                count: currentArc.chapterCount,
              })}
            </span>
          </div>
          <div className="arc-current-stat-item">
            <span className="arc-current-stat-pill">
              {formatMessage(messages.rankDuration, {
                rank: currentArc.durationRank,
                duration: formatArcDuration(currentArc, messages),
              })}
            </span>
          </div>
        </div>
      </div>

      <div id="arc-comparison-list" className="arc-comparison-list" role="list">
        {sortedArcs.map((arc) => {
          const arcName = arc.name[locale] ?? arc.name.en;
          const yearsText = formatArcYears(arc, locale);
          const percent =
            metric === "chapters"
              ? (arc.chapterCount / summary.maxChapters) * 100
              : (arc.spanIssues / summary.maxSpanIssues) * 100;
          const statText =
            metric === "chapters"
              ? formatMessage(messages.arcChaptersCount, {
                  count: arc.chapterCount,
                })
              : formatArcDuration(arc, messages);
          const rank = metric === "chapters" ? arc.chapterRank : arc.durationRank;

          return (
            <div
              key={arc.id}
              className={`arc-row ${arc.isCurrent ? "is-current" : ""}`}
              role="listitem"
            >
              <div className="arc-row-label">
                <span className="arc-rank">#{rank}</span>
                <span
                  className="arc-indicator"
                  style={{ backgroundColor: arc.color }}
                  aria-hidden="true"
                />
                <span className="arc-name">{arcName}</span>
                {arc.isCurrent ? (
                  <span className="arc-mini-pill">{messages.currentArcBadge}</span>
                ) : null}
              </div>

              <div className="arc-bar-track" aria-hidden="true">
                <div
                  className="arc-bar-fill"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: arc.color,
                  }}
                />
              </div>

              <div className="arc-row-stats">
                <span className="arc-stat-value">{statText}</span>
                <span className="arc-years">{yearsText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function PublicationHistory({
  capture = false,
  locale = "en",
  messages,
  years,
  arcIds,
  titles,
  arcSummary,
}: {
  capture?: boolean;
  locale?: Locale;
  messages: Messages["history"];
  years: readonly HistoryYear[];
  arcIds: readonly string[];
  titles: ChapterTitles;
  arcSummary: ArcComparisonSummary;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeCell, setActiveCell] = useState<ActiveCellInfo | null>(null);

  const updateTooltipFromTarget = useCallback(
    (target: HTMLElement | null) => {
      if (!target || !target.classList.contains("history-cell")) {
        setActiveCell(null);
        return;
      }

      const chart = chartRef.current;
      if (!chart) return;

      const year = Number(target.dataset.year);
      const issue = Number(target.dataset.issue);
      const released = target.dataset.released === "true";
      const chapter = target.dataset.chapter || undefined;
      const arc = target.dataset.arc || undefined;

      const cellRect = target.getBoundingClientRect();
      const chartRect = chart.getBoundingClientRect();

      const rawX = cellRect.left - chartRect.left + cellRect.width / 2;
      const y = cellRect.top - chartRect.top;
      const isTopRow = y < 50;

      const tooltipWidth = tooltipRef.current?.offsetWidth || 240;
      const x = getClampedX(rawX, tooltipWidth, chart);

      setActiveCell({
        year,
        issue,
        released,
        chapter,
        arc,
        rawX,
        x,
        y: isTopRow ? y + cellRect.height : y,
        isTopRow,
      });
    },
    [],
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>(".history-cell");
    updateTooltipFromTarget(target);
  };

  const handlePointerLeave = () => {
    setActiveCell(null);
  };

  // Close on outside touch or scroll
  useEffect(() => {
    const handleScrollOrTouchOutside = (e: Event) => {
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        setActiveCell(null);
      }
    };

    window.addEventListener("scroll", handleScrollOrTouchOutside, { passive: true });
    window.addEventListener("touchstart", handleScrollOrTouchOutside, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollOrTouchOutside);
      window.removeEventListener("touchstart", handleScrollOrTouchOutside);
    };
  }, []);

  useEffect(() => {
    if (!activeCell || !chartRef.current || !tooltipRef.current) return;
    const chart = chartRef.current;
    const tooltip = tooltipRef.current;
    const exactWidth = tooltip.offsetWidth;
    const exactX = getClampedX(activeCell.rawX, exactWidth, chart);

    if (Math.abs(exactX - activeCell.x) > 1) {
      tooltip.style.left = `${exactX}px`;
    }
  }, [activeCell]);

  const activeArcDef = getArcDefinition(activeCell?.arc);
  const activeChapterTitle =
    activeCell?.chapter === undefined
      ? undefined
      : titles[String(activeCell.chapter)];
  const chapterNum =
    activeCell?.chapter !== undefined
      ? typeof activeCell.chapter === "number"
        ? activeCell.chapter
        : parseInt(activeCell.chapter, 10)
      : undefined;

  return (
    <div className="history-container">
      {/* History Grid Scroll Container */}
      <div
        className="history-scroll"
        tabIndex={0}
        aria-label={messages.chartAria}
      >
        <div
          className="history-chart"
          ref={chartRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          {years.map(([year, cells]) => {
            const publishedCount = cells.filter((cell) =>
              Array.isArray(cell),
            ).length;

            return (
              <div className="history-row" key={year}>
                <span className="history-year">{year}</span>
                <div className="history-cells">
                  {cells.map((cell) => {
                    const released = Array.isArray(cell);
                    const issue = released
                      ? { number: cell[0], chapter: cell[1], arc: arcIds[cell[2]], released: true }
                      : { number: cell, chapter: undefined, arc: undefined, released: false };
                    const detail = formatMessage(
                      issue.released
                        ? messages.publishedIssue
                        : messages.emptyIssue,
                      {
                        chapter: issue.chapter ?? "",
                        issue: issue.number,
                      },
                    );

                    const isCellActive =
                      activeCell?.year === year &&
                      activeCell?.issue === issue.number;

                    const arcDef = issue.arc ? getArcDefinition(issue.arc) : undefined;

                    return (
                      <span
                        className={`history-cell ${
                          isCellActive ? "is-cell-active" : ""
                        }`}
                        data-released={issue.released ? "true" : "false"}
                        data-year={year}
                        data-issue={issue.number}
                        data-chapter={issue.chapter ?? ""}
                        data-arc={issue.arc ?? ""}
                        style={
                          issue.released && arcDef
                            ? ({
                                backgroundColor: arcDef.color,
                                borderColor: arcDef.color,
                              } as React.CSSProperties)
                            : undefined
                        }
                        key={year + "-" + issue.number}
                        title={detail}
                        aria-label={detail}
                        role="img"
                        tabIndex={0}
                        onFocus={(e) =>
                          updateTooltipFromTarget(e.currentTarget)
                        }
                        onBlur={() => setActiveCell(null)}
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

          {/* Clean HUD Tooltip */}
          {activeCell && (
            <div
              ref={tooltipRef}
              className={`history-cell-tooltip ${
                activeCell.isTopRow ? "is-below" : "is-above"
              }`}
              style={{
                left: `${activeCell.x}px`,
                top: `${activeCell.y}px`,
              }}
              role="tooltip"
              aria-hidden="true"
            >
              <div className="history-cell-tooltip-header">
                <span className="history-cell-tooltip-meta">
                  {activeCell.year} • WSJ #{String(activeCell.issue).padStart(2, "0")}
                </span>
                {activeArcDef && (
                  <span
                    className="history-cell-tooltip-arc"
                    style={{ color: activeArcDef.color }}
                  >
                    {activeArcDef.name[locale] ?? activeArcDef.name.en}
                  </span>
                )}
              </div>
              <div
                className="history-cell-tooltip-status"
                data-released={activeCell.released ? "true" : "false"}
              >
                <span className="history-cell-tooltip-label">
                  {activeCell.released ? (
                    activeChapterTitle ? (
                      <span>
                        {chapterNum !== undefined && !isNaN(chapterNum) && chapterNum > 0
                          ? `${chapterNum} : `
                          : ""}
                        <strong>{activeChapterTitle}</strong>
                      </span>
                    ) : (
                      formatMessage(messages.publishedIssue, {
                        chapter: activeCell.chapter ?? "",
                        issue: activeCell.issue,
                      })
                    )
                  ) : (
                    formatMessage(messages.emptyIssue, {
                      chapter: activeCell.chapter ?? "",
                      issue: activeCell.issue,
                    })
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {!capture && (
        <ArcComparison
          summary={arcSummary}
          locale={locale}
          messages={messages}
        />
      )}
    </div>
  );
}

export default PublicationHistory;
