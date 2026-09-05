"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { getArcDefinition } from "./data/arcs";
import { getChapterTitle } from "./data/chapter-titles";
import historyData from "./data/publication-history.json";

type PublicationIssue = {
  year: number;
  number: number;
  released?: boolean;
  chapter?: number | string;
  date?: string;
  arc?: string;
};

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

const issues = historyData as PublicationIssue[];

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

export function PublicationHistory({
  locale = "en",
  messages,
}: {
  locale?: Locale;
  messages: Messages["history"];
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
  const activeChapterTitle = getChapterTitle(activeCell?.chapter, locale);
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

                    const isCellActive =
                      activeCell?.year === issue.year &&
                      activeCell?.issue === issue.number;

                    const arcDef = issue.arc ? getArcDefinition(issue.arc) : undefined;

                    return (
                      <span
                        className={`history-cell ${
                          isCellActive ? "is-cell-active" : ""
                        }`}
                        data-released={issue.released ? "true" : "false"}
                        data-year={issue.year}
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
                        key={issue.year + "-" + issue.number}
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
    </div>
  );
}

export default PublicationHistory;
