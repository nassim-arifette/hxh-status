import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import {
  latestPublished,
  manuscriptsComplete,
  nextChapter,
  publicationStatus,
} from "./data/status";

// The link preview shown on Reddit, Discord and X: the same answer, figures
// and panel as the home page's first screen, in the site's palette (see
// DESIGN.md). It is rebuilt with every data change, so it states only what the
// data says at build time — no running day count that would go stale.

export const alt =
  "HxH Status: whether HUNTER×HUNTER is on hiatus, the latest chapter, the next chapter and Togashi's finished manuscripts";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const dynamic = "force-static";

const asset = (path: string) => readFile(join(process.cwd(), "app/assets", path));

// Satori needs static font instances, so the two Archivo cuts the image uses
// are vendored (SIL Open Font License).
const condensedBlack = asset("fonts/Archivo-Condensed-Black.ttf");
const medium = asset("fonts/Archivo-Medium.ttf");
const figure = asset("as-long-as-it-takes-og.png");

const INK = "#090909";
const PAPER = "#ecebe6";
const TONE = "#9a9993";
const HUNTER = "#6fd27c";

function Fact({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        paddingTop: 16,
        paddingRight: 18,
      }}
    >
      <span style={{ color: TONE, fontSize: 22 }}>{label}</span>
      <span
        style={{
          marginTop: 6,
          color: accent ? HUNTER : PAPER,
          fontFamily: "Archivo Condensed",
          fontSize: 76,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default async function OpenGraphImage() {
  const [black, regular, art] = await Promise.all([condensedBlack, medium, figure]);
  const isPublishing = publicationStatus === "publishing";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: isPublishing ? "#3fae4f" : INK,
        color: isPublishing ? "#06210d" : PAPER,
        fontFamily: "Archivo",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: isPublishing ? 1200 : 700,
          padding: "52px 48px 48px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 28 }}>
          <span style={{ display: "flex", fontFamily: "Archivo Condensed", fontSize: 34 }}>
            H<span style={{ color: isPublishing ? "#06210d" : HUNTER }}>×</span>H
          </span>
          <span>Status</span>
          <span style={{ marginLeft: "auto", color: isPublishing ? "#06210d" : TONE, fontSize: 22 }}>
            hxhstatus.com
          </span>
        </div>

        <span style={{ marginTop: 64, color: isPublishing ? "#06210d" : TONE, fontSize: 32 }}>
          Is HUNTER×HUNTER on hiatus?
        </span>
        <span
          style={{
            marginTop: 8,
            fontFamily: "Archivo Condensed",
            fontSize: 150,
            lineHeight: 0.9,
          }}
        >
          {isPublishing ? "Publishing" : "On hiatus"}
        </span>

        <div
          style={{
            display: "flex",
            marginTop: "auto",
            borderTop: `4px solid ${isPublishing ? "#06210d" : PAPER}`,
          }}
        >
          <Fact label="Latest chapter" value={latestPublished.chapter} accent={!isPublishing} />
          <Fact label="Next chapter" value={nextChapter.chapter} />
          <Fact label="Manuscripts done" value={manuscriptsComplete.chapter} />
        </div>
      </div>

      {isPublishing ? null : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            width: 500,
            paddingRight: 24,
            paddingBottom: 24,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>. */}
          <img
            src={`data:image/png;base64,${art.toString("base64")}`}
            width={471}
            height={500}
            alt=""
          />
        </div>
      )}
    </div>,
    {
      ...size,
      fonts: [
        { name: "Archivo Condensed", data: black, style: "normal", weight: 900 },
        { name: "Archivo", data: regular, style: "normal", weight: 500 },
      ],
    },
  );
}
