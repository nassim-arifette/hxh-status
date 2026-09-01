import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { createElement } from "react";

// Lucide's React components are client-only. Its official icon-node exports let
// the server-side ImageResponse renderer use the exact same iconography.
// @ts-expect-error Lucide does not publish declarations for individual .mjs icon nodes.
import { __iconNode as checkIcon } from "lucide-react/dist/esm/icons/check.mjs";
// @ts-expect-error Lucide does not publish declarations for individual .mjs icon nodes.
import { __iconNode as circleDashedIcon } from "lucide-react/dist/esm/icons/circle-dashed.mjs";
// @ts-expect-error Lucide does not publish declarations for individual .mjs icon nodes.
import { __iconNode as fileCheckIcon } from "lucide-react/dist/esm/icons/file-check-corner.mjs";
// @ts-expect-error Lucide does not publish declarations for individual .mjs icon nodes.
import { __iconNode as panelsTopLeftIcon } from "lucide-react/dist/esm/icons/panels-top-left.mjs";
// @ts-expect-error Lucide does not publish declarations for individual .mjs icon nodes.
import { __iconNode as penLineIcon } from "lucide-react/dist/esm/icons/pen-line.mjs";
// @ts-expect-error Lucide does not publish declarations for individual .mjs icon nodes.
import { __iconNode as sendIcon } from "lucide-react/dist/esm/icons/send.mjs";

import {
  chapters,
  latestPublished,
  nextChapter,
  serialization,
  workConfirmed,
} from "./data/status";

export const alt =
  "HxH Status publication and production tracker with current chapter milestones";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const dynamic = "force-static";

const geistSans = readFile(
  join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf",
  ),
);

const geistMono = readFile(
  join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf",
  ),
);

const statusStyles = {
  published: {
    accent: "#78c963",
    background: "#172b18",
    border: "#315f32",
    icon: checkIcon,
  },
  delivered: {
    accent: "#68a0ff",
    background: "#15233a",
    border: "#2d518d",
    icon: sendIcon,
  },
  manuscript: {
    accent: "#50bcb2",
    background: "#142b29",
    border: "#28625d",
    icon: fileCheckIcon,
  },
  background: {
    accent: "#d6aa4d",
    background: "#2d2514",
    border: "#665021",
    icon: panelsTopLeftIcon,
  },
  inking: {
    accent: "#df824c",
    background: "#301f15",
    border: "#724027",
    icon: penLineIcon,
  },
  unknown: {
    accent: "#6e7770",
    background: "#171b18",
    border: "#353b37",
    icon: circleDashedIcon,
  },
} as const;

type LucideIconNode = ReadonlyArray<
  readonly [string, Record<string, string>]
>;

function LucideIcon({ iconNode }: { iconNode: LucideIconNode }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconNode.map(([tag, attributes]) =>
        createElement(tag, attributes),
      )}
    </svg>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 0",
        borderTop: "1px solid #252c27",
      }}
    >
      <span
        style={{
          color: "#98a099",
          fontFamily: "Geist Mono",
          fontSize: 18,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <strong
        style={{
          color: "#f3f6f3",
          fontSize: 42,
          fontWeight: 600,
          letterSpacing: "-0.05em",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

export default async function OpenGraphImage() {
  const [sans, mono] = await Promise.all([geistSans, geistMono]);
  const isPublishing = serialization === "publishing";
  const firstPreviewChapter = latestPublished.chapter - 2;
  const previewChapters = chapters
    .filter((chapter) => chapter.chapter >= firstPreviewChapter)
    .slice(0, 18);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "52px 58px 40px",
        background: "#0b0e0c",
        color: "#f3f6f3",
        fontFamily: "Geist Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 28,
          borderBottom: "1px solid #252c27",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              fontFamily: "Geist Mono",
              fontSize: 28,
              letterSpacing: "-0.06em",
            }}
          >
            H<span style={{ color: "#78c963" }}>×</span>H
          </span>
          <span style={{ color: "#a7aea8", fontSize: 25 }}>Status</span>
        </div>
        <span
          style={{
            color: "#747c76",
            fontFamily: "Geist Mono",
            fontSize: 18,
            letterSpacing: "0.04em",
          }}
        >
          hxhstatus.com
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "stretch",
          justifyContent: "space-between",
          paddingTop: 42,
        }}
      >
        <div
          style={{
            width: 650,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: isPublishing ? "#78c963" : "#98a099",
              fontFamily: "Geist Mono",
              fontSize: 18,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: isPublishing ? "#78c963" : "#747c76",
              }}
            />
            {isPublishing ? "Serializing" : "On hiatus"}
          </div>

          <div
            style={{
              width: 650,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {previewChapters.map((chapter) => {
              const status = statusStyles[chapter.status];

              return (
                <div
                  key={chapter.chapter}
                  style={{
                    width: 100,
                    height: 94,
                    display: "flex",
                    flexDirection: "column",
                    padding: "11px 10px 9px",
                    border: `1px solid ${status.border}`,
                    borderRadius: 8,
                    background: status.background,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#f3f6f3",
                      fontSize: 25,
                      fontWeight: 600,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {chapter.chapter}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        width: 23,
                        height: 23,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 5,
                        background: status.border,
                        color: status.accent,
                        fontFamily: "Geist Mono",
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      <LucideIcon iconNode={status.icon} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            width: 360,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 38,
            borderLeft: "1px solid #252c27",
          }}
        >
          <Metric label="Published" value={latestPublished.chapter} />
          <Metric label="Next chapter" value={nextChapter.chapter} />
          <Metric label="Work confirmed" value={workConfirmed.chapter} />
        </div>
      </div>

      <div
        style={{
          height: 18,
          display: "flex",
          gap: 5,
        }}
      >
        {chapters.map((chapter) => (
          <span
            key={chapter.chapter}
            style={{
              height: 9,
              flex: 1,
              borderRadius: 2,
              background: statusStyles[chapter.status].accent,
            }}
          />
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Geist Sans",
          data: sans,
          style: "normal",
          weight: 600,
        },
        {
          name: "Geist Mono",
          data: mono,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
