import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import localeConfig from "../lib/locales.json" with { type: "json" };
import { CONTENT_SECTIONS } from "../lib/routes.ts";

// `output: export` leaves no request-time hook to mint a nonce, so the inline
// scripts a page ships — Next's hydration payload and the date rewrite — used
// to be waved through with 'unsafe-inline'. They are static files, so their
// bytes are known once the export exists: this hashes each page's scripts and
// writes a Content-Security-Policy naming exactly those hashes.
//
// public/_headers carries the policy without 'unsafe-inline'. If this step ever
// stops running, scripts are blocked and the failure is loud, which is the
// right way round for a security control.

const root = process.cwd();
const outDirectory = join(root, "out");
const headersPath = join(outDirectory, "_headers");

// Cloudflare allows a hundred rules in _headers, and a page whose flight
// payload is unique contributes a hash nobody else can reuse. A rule per page
// therefore cannot survive a chapter page per chapter. Sections whose size
// grows with the data are covered by one rule carrying the union of their
// pages' hashes; because the content pages are stripped of their runtime by
// scripts/strip-page-scripts.mjs, that union is a single shared hash. Grouping
// only decides how the rules are addressed: the hashes always come from the
// pages that the rule will actually serve.
const localeGroups = Object.entries(localeConfig.locales)
  .filter(([locale, settings]) => settings.published && locale !== "en")
  .map(([locale]) => `/${locale}/*`);

const GROUP_PATTERNS = [
  "/capture/*",
  ...localeGroups,
  ...CONTENT_SECTIONS.map((section) => `/${section}/*`),
];

// A script with src is fetched, not inline. application/ld+json is data: the
// browser never executes it, so script-src does not gate it.
const SCRIPT = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g;
const NON_EXECUTABLE = /type\s*=\s*"(application\/ld\+json|application\/json|text\/template)"/i;

function inlineScripts(html) {
  return [...html.matchAll(SCRIPT)]
    .filter(([, attributes]) => !NON_EXECUTABLE.test(attributes))
    .map(([, , body]) => body);
}

function hashOf(script) {
  return `'sha256-${createHash("sha256").update(script, "utf8").digest("base64")}'`;
}

// out/index.html -> /, out/fr.html -> /fr, out/capture/fr/production.html ->
// /capture/fr/production. 404.html is not routable: it is served in place of
// anything missing, so its hashes belong to the /* fallback instead.
function routeFor(relativePath) {
  const segments = relativePath.split(sep);
  const last = segments.at(-1).replace(/\.html$/, "");
  if (segments.length === 1 && last === "404") return null;
  const path = [...segments.slice(0, -1), last === "index" ? "" : last].join("/");
  return `/${path}`.replace(/\/$/, "") || "/";
}

function groupFor(route) {
  return GROUP_PATTERNS.find((pattern) =>
    route.startsWith(pattern.slice(0, -1)),
  );
}

async function* htmlFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

const original = await readFile(headersPath, "utf8");

const cspLine = original
  .split("\n")
  .find((line) => line.trim().startsWith("Content-Security-Policy:"));
if (!cspLine) throw new Error("public/_headers has no Content-Security-Policy.");

const fallbackPolicy = cspLine.slice(cspLine.indexOf(":") + 1).trim();
if (!/script-src[^;]*'unsafe-inline'/.test(fallbackPolicy)) {
  throw new Error(
    "The wildcard CSP must allow inline scripts so it cannot veto the stricter per-page hash policy.",
  );
}
const strictPolicy = fallbackPolicy.replace(
  /(script-src[^;]*)\s+'unsafe-inline'/,
  "$1",
);
if (!/script-src\s+'self'/.test(strictPolicy)) {
  throw new Error("Cannot find \"script-src 'self'\" to extend with hashes.");
}

function policyWith(hashes) {
  return strictPolicy.replace(
    /script-src\s+'self'/,
    `script-src 'self' ${hashes.join(" ")}`,
  );
}

const pages = [];
let fallbackHashes = [];

for await (const path of htmlFiles(outDirectory)) {
  const relativePath = relative(outDirectory, path);
  const html = await readFile(path, "utf8");
  const hashes = [...new Set(inlineScripts(html).map(hashOf))];
  const route = routeFor(relativePath);

  if (route === null) {
    fallbackHashes = hashes;
    continue;
  }
  pages.push({ route, hashes, rule: groupFor(route) ?? route });
}

// One entry per rule, holding every hash the pages it serves need.
const rules = new Map();
for (const page of pages) {
  const hashes = rules.get(page.rule) ?? new Set();
  for (const hash of page.hashes) hashes.add(hash);
  rules.set(page.rule, hashes);
}

const blocks = [...rules.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([rule, hashes]) => {
    const line = `  Content-Security-Policy: ${policyWith([...hashes].sort())}`;
    if (line.length > 2000) {
      throw new Error(
        `The policy for ${rule} is ${line.length} characters; _headers allows 2000.`,
      );
    }
    return { rule, block: `${rule}\n${line}` };
  });

// Cloudflare applies both `/*` and the matching route block. The wildcard must
// not veto the exact-route hashes, so it deliberately permits inline scripts;
// the stricter policy below removes that permission and names only the hashes
// its pages ship. CSP intersection means the specific policy wins.
let updated = original;

updated +=
  "\n\n# Generated by scripts/inject-csp-hashes.mjs. Each rule names the hashes of\n" +
  "# the inline scripts its pages ship, so an injected script is refused even\n" +
  "# though the document has no nonce.\n" +
  blocks.map((entry) => entry.block).join("\n\n") +
  "\n";

const ruleCount = (updated.match(/^\/\S*$/gm) ?? []).length;
if (ruleCount > 100) {
  throw new Error(`_headers would hold ${ruleCount} rules; Cloudflare allows 100.`);
}

await writeFile(headersPath, updated, "utf8");

// Prove it: every page's scripts must appear in the policy that will serve it.
for (const page of pages) {
  const entry = blocks.find((candidate) => candidate.rule === page.rule);
  for (const hash of page.hashes) {
    if (!entry.block.includes(hash)) {
      throw new Error(`${page.route} is missing the hash for one of its scripts.`);
    }
  }
}

console.log(
  JSON.stringify({
    message: "Wrote inline-script hashes into _headers.",
    pages: pages.length,
    rules: ruleCount,
    fallbackHashes: fallbackHashes.length,
    longestPolicy: Math.max(...blocks.map((entry) => entry.block.length)),
  }),
);
