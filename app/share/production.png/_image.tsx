import { ImageResponse } from "next/og";

import { chapters, lastUpdated } from "../../data/status";
import {
  formatShareDate,
  getShareImageFonts,
  shareColors,
  ShareImageHeader,
  shareStatusStyles,
} from "../_shared";

const size = {
  width: 1200,
  height: 580,
};

const chapterRows = Array.from(
  { length: Math.ceil(chapters.length / 10) },
  (_, index) => chapters.slice(index * 10, index * 10 + 10),
);

export async function createProductionImageResponse() {
  const fonts = await getShareImageFonts();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "32px 46px 28px",
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
          marginTop: 20,
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
            Kakin Succession Contest
          </span>
          <span
            style={{
              marginTop: 5,
              color: shareColors.foreground,
              fontSize: 34,
              letterSpacing: "-0.04em",
            }}
          >
            Production tracker
          </span>
        </div>
        <span
          style={{
            color: shareColors.muted,
            fontFamily: "Geist Mono",
            fontSize: 13,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Updated {formatShareDate(lastUpdated)}
        </span>
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 9,
          marginTop: 18,
        }}
      >
        {chapterRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{ width: "100%", display: "flex", gap: 8 }}
          >
            {row.map((chapter) => {
              const status = shareStatusStyles[chapter.status];

              return (
                <div
                  key={chapter.chapter}
                  style={{
                    height: 84,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${status.border}`,
                    borderRadius: 8,
                    background: status.background,
                  }}
                >
                  <span
                    style={{
                      color: shareColors.foreground,
                      fontFamily: "Geist Mono",
                      fontSize: 24,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {chapter.chapter}
                  </span>
                  <span
                    style={{
                      width: 21,
                      height: 5,
                      marginTop: 10,
                      borderRadius: 999,
                      background: status.accent,
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          gap: "9px 18px",
          marginTop: 20,
          paddingTop: 17,
          borderTop: `1px solid ${shareColors.border}`,
        }}
      >
        {Object.entries(shareStatusStyles).map(([status, style]) => (
          <div
            key={status}
            style={{
              width: 350,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: style.accent,
              fontSize: 13,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: style.accent,
              }}
            />
            <span>{style.label}</span>
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts,
    },
  );
}
