import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { trackerSummary } from "../automation/milestones.mjs";

// Keep in step with `metadataBase` in `app/layout.tsx`.
const ORIGIN = "https://hxhstatus.com";
const LOCALES = ["en", "fr", "ja"];
const SCHEMA_VERSION = 1;

const root = process.cwd();
const statusPath = join(root, "app", "data", "status-data.json");
const outDirectory = join(root, "out");
const outPath = join(outDirectory, "status.json");

// The chart PNGs keep a stable filename, so a consumer that wants the current
// image has to bust its own cache. Handing them a revisioned URL is cheaper
// than asking every bot author to work that out.
function chartUrls(name, revision) {
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      `${ORIGIN}/share/${locale === "en" ? "" : `${locale}/`}${name}.png?r=${revision}`,
    ]),
  );
}

const statusData = JSON.parse(await readFile(statusPath, "utf8"));
const summary = trackerSummary(statusData);

try {
  await access(outDirectory);
} catch {
  throw new Error(
    "out/ does not exist. Run this after `next build`, not on its own.",
  );
}

const payload = {
  schemaVersion: SCHEMA_VERSION,
  ...summary,
  charts: {
    production: chartUrls("production", summary.revision),
    publicationHistory: chartUrls("publication-history", summary.revision),
  },
  chapters: [...statusData.chapters].sort(
    (left, right) => left.chapter - right.chapter,
  ),
};

// No build timestamp: the file must stay byte-identical when the tracker has
// not moved, so consumers and caches can revalidate cheaply.
await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify({
    message: "Wrote the public tracker JSON.",
    revision: payload.revision,
    chapters: payload.chapters.length,
  }),
);
