import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { buildBadges } from "./badges.mjs";
import { buildFeedsAndCalendar } from "./feeds.mjs";

const run = promisify(execFile);
const locales = ["ar", "en", "es", "fr", "ja", "pt", "zh"];
const messagesByLocale = Object.fromEntries(locales.map((locale) => [locale, {}]));
const initialStatus = {
  lastUpdated: "2026-09-07",
  chapters: [
    { chapter: 420, status: "published", releaseAt: "2026-09-07T00:00:00+09:00" },
    { chapter: 421, status: "scheduled", releaseAt: "2026-09-14T00:00:00+09:00" },
    { chapter: 422, status: "inking", updatedAt: "2026-09-07" },
  ],
};
const newPost = {
  id: "2099837550617903464", createdAt: "2026-09-15T06:30:00.000Z",
  originalText: "New post", url: "https://x.com/Un4v5s8bgsVk9Xp/status/2099837550617903464",
};

async function bashPath() {
  if (process.platform !== "win32") return "bash";
  // Use Git Bash rather than the Windows WSL launcher named bash.exe.
  const candidates = [
    join(process.env.ProgramFiles || "C:/Program Files", "Git/bin/bash.exe"),
    join(process.env.LOCALAPPDATA || "", "Programs/Git/bin/bash.exe"),
  ];
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch { /* Try the next Git installation. */ }
  }
  throw new Error("Workflow artifact checks require Git Bash on Windows.");
}

async function workflowGuard(workflow, step) {
  const source = await readFile(new URL(`../.github/workflows/${workflow}`, import.meta.url), "utf8");
  const start = source.indexOf(`      - name: ${step}`);
  assert.ok(start >= 0, `Missing ${step} workflow step.`);
  const runStart = source.indexOf("        run: |", start);
  const lines = source.slice(runStart).split(/\r?\n/).slice(1);
  const scriptLines = [];
  for (const line of lines) {
    if (line.trim() && !line.startsWith("          ")) break;
    scriptLines.push(line.slice(10));
  }
  const script = scriptLines.join("\n");
  const end = script.indexOf(workflow === "togashi-status.yml"
    ? "if git diff --cached --quiet; then" : "git config user.name");
  assert.ok(end > 0, "Missing boundary after artifact validation.");
  return script.slice(0, end);
}

async function generate(directory, status, posts) {
  const publicDir = join(directory, "public");
  await buildFeedsAndCalendar({ publicDir, statusData: status, togashiPosts: posts,
    messagesByLocale, locales });
  await buildBadges({ publicDir, statusData: status, locales });
}

async function fixture(callback) {
  const directory = await mkdtemp(join(tmpdir(), "hxh-workflow-artifacts-"));
  const git = async (...args) => (await run("git", args, { cwd: directory })).stdout.trim();
  try {
    await mkdir(join(directory, "app/data"), { recursive: true });
    await mkdir(join(directory, "automation"));
    await mkdir(join(directory, "public/share/en"), { recursive: true });
    await writeFile(join(directory, "app/data/status-data.json"), JSON.stringify(initialStatus));
    await writeFile(join(directory, "app/data/togashi-posts.json"), "[]");
    await writeFile(join(directory, "automation/state.json"), "{}");
    await writeFile(join(directory, "public/share/en/production.png"), "old chart");
    await writeFile(join(directory, "public/sw.js"), "original service worker");
    await generate(directory, initialStatus, []);
    await git("init", "--initial-branch=main");
    await git("config", "core.autocrlf", "false");
    await git("config", "user.name", "Artifact test");
    await git("config", "user.email", "artifact-test@example.com");
    await git("add", ".");
    await git("commit", "-m", "fixture");
    const check = async ({ publication = false, feed = false, status = false } = {}) => {
      const workflow = publication ? "publication-status.yml" : "togashi-status.yml";
      const script = await workflowGuard(workflow, publication
        ? "Commit and deploy the publication" : "Commit the validated result");
      await run(await bashPath(), ["-e", "-o", "pipefail", "-c", script], {
        cwd: directory, env: { ...process.env, FEED_CHANGED: String(feed), STATUS_CHANGED: String(status) },
      });
      return (await git("diff", "--cached", "--name-only")).split("\n");
    };
    await callback({ directory, git, check });
  } finally {
    assert.ok(resolve(directory).startsWith(join(resolve(tmpdir()), "hxh-workflow-artifacts-")));
    await rm(directory, { recursive: true, force: true });
  }
}

test("a translated post stages every generated Atom feed without status artifacts", async () => {
  await fixture(async ({ directory, check }) => {
    await writeFile(join(directory, "app/data/togashi-posts.json"), JSON.stringify([newPost]));
    await generate(directory, initialStatus, [newPost]);
    const staged = await check({ feed: true });
    assert.ok(staged.includes("app/data/togashi-posts.json"));
    assert.ok(staged.includes("public/feed.xml"));
    for (const locale of locales) assert.ok(staged.includes(`public/${locale}/feed.xml`));
    assert.equal(staged.some((path) => path.startsWith("public/badge/") || path.endsWith(".ics")), false);
  });
});

test("a chapter milestone stages generated badges, feeds and its share image", async () => {
  await fixture(async ({ directory, check }) => {
    const status = structuredClone(initialStatus);
    status.chapters[2].status = "delivered";
    await writeFile(join(directory, "app/data/status-data.json"), JSON.stringify(status));
    await writeFile(join(directory, "public/share/en/production.png"), "new chart");
    await generate(directory, status, []);
    const staged = await check({ status: true });
    assert.ok(staged.includes("app/data/status-data.json"));
    assert.ok(staged.includes("public/share/en/production.png"));
    assert.ok(staged.includes("public/badge/progress.svg"));
    for (const locale of locales) assert.ok(staged.includes(`public/badge/${locale}/progress.svg`));
    assert.ok(staged.includes("public/feed.xml"));
  });
});

test("an official publication stages its changed calendar and badge copies", async () => {
  await fixture(async ({ directory, check }) => {
    const status = structuredClone(initialStatus);
    status.chapters[1].status = "published";
    await writeFile(join(directory, "app/data/status-data.json"), JSON.stringify(status));
    await generate(directory, status, []);
    const staged = await check({ publication: true });
    assert.ok(staged.includes("public/releases.ics"));
    assert.ok(staged.includes("public/badge/latest.svg"));
    for (const locale of locales) assert.ok(staged.includes(`public/${locale}/feed.xml`));
  });
});

for (const publication of [false, true]) {
  test(`${publication ? "publication" : "post"} guard rejects an unsupported staged locale`, async () => {
    await fixture(async ({ directory, git, check }) => {
      await mkdir(join(directory, "public/de"));
      await writeFile(join(directory, "public/de/feed.xml"), "unexpected locale");
      await git("add", "public/de/feed.xml");
      await assert.rejects(check({ publication, feed: true, status: true }), /Unexpected .*artifact/);
    });
  });
  test(`${publication ? "publication" : "post"} guard rejects an unrelated tracked build change`, async () => {
    await fixture(async ({ directory, check }) => {
      await writeFile(join(directory, "public/sw.js"), "unexpected service worker change");
      await assert.rejects(check({ publication, feed: true, status: true }));
    });
  });
}

test("a feed-only update cannot stage a calendar change", async () => {
  await fixture(async ({ directory, git, check }) => {
    await writeFile(join(directory, "public/releases.ics"), "unexpected calendar change");
    await git("add", "public/releases.ics");
    await assert.rejects(check({ feed: true }), /Unexpected status export artifact/);
  });
});
