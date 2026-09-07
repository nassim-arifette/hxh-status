import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCALE_COOKIE,
  localeRedirect,
  negotiateLocale,
  parseAcceptLanguage,
} from "./locale-redirect.mjs";

function request(path, headers = {}, method = "GET") {
  return new Request(`https://hxhstatus.com${path}`, { method, headers });
}

test("Accept-Language is ordered by q and drops zero-weight tags", () => {
  assert.deepEqual(
    parseAcceptLanguage("sv, fr;q=0.8, en;q=0.9, de;q=0"),
    ["sv", "en", "fr"],
  );
  assert.deepEqual(parseAcceptLanguage(""), []);
  assert.deepEqual(parseAcceptLanguage(null), []);
});

test("a region tag negotiates to its base language", () => {
  assert.equal(negotiateLocale(request("/", { "Accept-Language": "pt-BR" })), "pt");
  assert.equal(negotiateLocale(request("/", { "Accept-Language": "zh-Hans-CN" })), "zh");
});

test("a language we do not publish is skipped, not treated as the answer", () => {
  assert.equal(
    negotiateLocale(request("/", { "Accept-Language": "sv, fr;q=0.8" })),
    "fr",
  );
});

test("no header, an unknown language, or a wildcard all mean English", () => {
  assert.equal(negotiateLocale(request("/")), "en");
  assert.equal(negotiateLocale(request("/", { "Accept-Language": "sv, no" })), "en");
  assert.equal(negotiateLocale(request("/", { "Accept-Language": "*" })), "en");
});

test("an explicit choice in the cookie beats the header", () => {
  const chosen = request("/", {
    "Accept-Language": "fr",
    Cookie: `${LOCALE_COOKIE}=ja; other=1`,
  });
  assert.equal(negotiateLocale(chosen), "ja");
});

test("a cookie naming an unpublished locale falls back to the header", () => {
  const bogus = request("/", {
    "Accept-Language": "fr",
    Cookie: `${LOCALE_COOKIE}=klingon`,
  });
  assert.equal(negotiateLocale(bogus), "fr");
});

test("English readers are served / rather than redirected", () => {
  assert.equal(localeRedirect(request("/", { "Accept-Language": "en-GB" })), null);
  assert.equal(localeRedirect(request("/")), null);
});

test("a non-English reader gets a 302 that preserves the query", () => {
  const response = localeRedirect(
    request("/?utm_source=x", { "Accept-Language": "fr" }),
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "/fr?utm_source=x");
  assert.equal(response.headers.get("Vary"), "Accept-Language, Cookie");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("only the root is negotiated", () => {
  for (const path of ["/fr", "/ja", "/capture/fr/production", "/status.json"]) {
    assert.equal(localeRedirect(request(path, { "Accept-Language": "fr" })), null);
  }
});

test("non-idempotent methods are left alone", () => {
  assert.equal(
    localeRedirect(request("/", { "Accept-Language": "fr" }, "POST")),
    null,
  );
});

test("the cookie name matches the one the language switcher writes", async () => {
  // The switcher sets this cookie from lib/i18n.ts and the Worker reads it
  // here. They cannot import each other, so a rename in one place would
  // silently stop the explicit choice from reaching the redirect.
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const source = await readFile(
    fileURLToPath(new URL("../lib/i18n.ts", import.meta.url)),
    "utf8",
  );
  assert.match(
    source,
    new RegExp(`localeCookieName = "${LOCALE_COOKIE}"`),
    "lib/i18n.ts and worker/locale-redirect.mjs disagree on the cookie name.",
  );
});
