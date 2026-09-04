import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// The service worker runs detached from the page and cannot import the message
// catalogs, so its notification strings are copied into public/sw.js. This
// script performs that copy, which keeps messages/*.json the single place a
// translator edits. `--check` reports a stale copy instead of rewriting it.

const root = process.cwd();
const serviceWorkerPath = join(root, "public", "sw.js");
const startMarker = "// <generated:notification-copy>";
const endMarker = "// </generated:notification-copy>";

// The toggle in the header and the notification that confirms it say the same
// thing, so both read from the catalog section the control already uses.
const controlKeys = ["enabledTitle", "enabledBody"];

export async function buildNotificationCopy() {
  const localeConfig = JSON.parse(
    await readFile(join(root, "lib", "locales.json"), "utf8"),
  );
  const copy = {};

  for (const locale of Object.keys(localeConfig.locales)) {
    const catalog = JSON.parse(
      await readFile(join(root, "messages", `${locale}.json`), "utf8"),
    );

    copy[locale] = {
      ...Object.fromEntries(
        controlKeys.map((key) => [key, catalog.notifications[key]]),
      ),
      ...catalog.push,
    };
  }

  return copy;
}

export async function buildBlock() {
  const copy = await buildNotificationCopy();

  return [
    startMarker,
    `const notificationCopy = ${JSON.stringify(copy, null, 2)};`,
    endMarker,
  ].join("\n");
}

function replaceBlock(source, block) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);

  if (start === -1 || end === -1) {
    throw new Error("public/sw.js has no generated notification-copy block.");
  }

  return (
    source.slice(0, start) + block + source.slice(end + endMarker.length)
  );
}

export async function readServiceWorker() {
  return readFile(serviceWorkerPath, "utf8");
}

export async function isUpToDate() {
  const source = await readServiceWorker();
  return source === replaceBlock(source, await buildBlock());
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const source = await readServiceWorker();
  const updated = replaceBlock(source, await buildBlock());

  if (process.argv.includes("--check")) {
    if (source !== updated) {
      console.error(
        "public/sw.js is out of date. Run `npm run sw:copy`.",
      );
      process.exitCode = 1;
    } else {
      console.log("public/sw.js notification copy matches the catalogs.");
    }
  } else if (source === updated) {
    console.log("public/sw.js notification copy was already up to date.");
  } else {
    await writeFile(serviceWorkerPath, updated);
    console.log("public/sw.js notification copy regenerated.");
  }
}
