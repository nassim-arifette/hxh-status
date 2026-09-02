import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ChapterStatus } from "../data/status";

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

export const shareColors = {
  background: "#0b0e0c",
  border: "#252c27",
  card: "#111512",
  foreground: "#f3f6f3",
  muted: "#879189",
  secondary: "#a7aea8",
} as const;

export const shareStatusStyles: Record<
  ChapterStatus,
  {
    accent: string;
    background: string;
    border: string;
    label: string;
  }
> = {
  published: {
    accent: "#78c963",
    background: "#172b18",
    border: "#315f32",
    label: "Published",
  },
  scheduled: {
    accent: "#50bcb2",
    background: "#142b29",
    border: "#28625d",
    label: "Scheduled for publication",
  },
  delivered: {
    accent: "#68a0ff",
    background: "#15233a",
    border: "#2d518d",
    label: "Delivered to Jump",
  },
  background: {
    accent: "#d6aa4d",
    background: "#2d2514",
    border: "#665021",
    label: "Background specifications complete",
  },
  inking: {
    accent: "#df824c",
    background: "#301f15",
    border: "#724027",
    label: "Character inking complete",
  },
  unknown: {
    accent: "#879189",
    background: "#171b18",
    border: "#353b37",
    label: "No confirmed update",
  },
};

export async function getShareImageFonts() {
  const [sans, mono] = await Promise.all([geistSans, geistMono]);

  return [
    {
      name: "Geist Sans",
      data: sans,
      style: "normal" as const,
      weight: 600 as const,
    },
    {
      name: "Geist Mono",
      data: mono,
      style: "normal" as const,
      weight: 400 as const,
    },
  ];
}

export function formatShareDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function ShareImageHeader() {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 18,
        borderBottom: `1px solid ${shareColors.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 11 }}>
        <span
          style={{
            color: shareColors.foreground,
            fontFamily: "Geist Mono",
            fontSize: 25,
            letterSpacing: "-0.06em",
          }}
        >
          H
          <span style={{ color: "#78c963" }}>{String.fromCharCode(215)}</span>
          H
        </span>
        <span style={{ color: shareColors.secondary, fontSize: 22 }}>
          Status
        </span>
      </div>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          padding: "7px 11px",
          border: `1px solid ${shareColors.border}`,
          borderRadius: 6,
          background: shareColors.card,
          color: shareColors.secondary,
          fontFamily: "Geist Mono",
          fontSize: 14,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        hxhstatus.com
      </span>
    </div>
  );
}
