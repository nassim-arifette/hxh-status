import { ImageResponse } from "next/og";

import historyData from "../../data/publication-history.json";
import {
  getShareImageFonts,
  shareColors,
  ShareImageHeader,
} from "../_shared";

const size = {
  width: 1200,
  height: 840,
};

type PublicationIssue = {
  year: number;
  number: number;
  released?: boolean;
  chapter?: number | string;
};

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

const newestYear = publicationByYear[0]?.year ?? 0;
const oldestYear = publicationByYear.at(-1)?.year ?? 0;

export async function createPublicationHistoryImageResponse() {
  const fonts = await getShareImageFonts();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "30px 42px 28px",
        background: shareColors.background,
        color: shareColors.foreground,
        fontFamily: "Geist Sans",
      }}
    >
      <ShareImageHeader />

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: shareColors.muted,
              fontFamily: "Geist Mono",
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {oldestYear}-{newestYear}
          </span>
          <span
            style={{
              marginTop: 4,
              color: shareColors.foreground,
              fontSize: 32,
              letterSpacing: "-0.04em",
            }}
          >
            Publication history
          </span>
        </div>
        <span
          style={{
            color: shareColors.muted,
            fontFamily: "Geist Mono",
            fontSize: 12,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Right column: chapters / year
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          marginTop: 16,
          color: shareColors.secondary,
          fontSize: 12,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#78c963",
            }}
          />
          Chapter published
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              width: 10,
              height: 10,
              border: "1px solid #313833",
              borderRadius: 2,
              background: "#202521",
            }}
          />
          No chapter
        </span>
      </div>

      <div
        style={{
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 3,
          marginTop: 14,
          padding: "13px 18px",
          border: `1px solid ${shareColors.border}`,
          borderRadius: 14,
          background: shareColors.card,
        }}
      >
        {publicationByYear.map(({ year, issues: yearIssues }) => {
          const publishedCount = yearIssues.filter(
            (issue) => issue.released,
          ).length;

          return (
            <div
              key={year}
              style={{
                width: "100%",
                height: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  width: 48,
                  display: "flex",
                  color: shareColors.muted,
                  fontFamily: "Geist Mono",
                  fontSize: 11,
                }}
              >
                {year}
              </span>
              <div
                style={{
                  width: 850,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  marginLeft: 10,
                  marginRight: 12,
                }}
              >
                {yearIssues.map((issue) => (
                  <span
                    key={`${issue.year}-${issue.number}`}
                    style={{
                      width: 14,
                      height: 9,
                      flex: "0 0 14px",
                      border: issue.released
                        ? "1px solid #5ea950"
                        : "1px solid #2d342f",
                      borderRadius: 1,
                      background: issue.released ? "#78c963" : "#202521",
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  width: 30,
                  display: "flex",
                  justifyContent: "flex-end",
                  color: shareColors.muted,
                  fontFamily: "Geist Mono",
                  fontSize: 11,
                }}
              >
                {String(publishedCount).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>
    </div>,
    {
      ...size,
      fonts,
    },
  );
}
