import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCALE_COOKIE,
  cookieLocale,
  localeRedirect,
  negotiateLocale,
} from "./locale-redirect.mjs";

function request(path, headers = {}, method = "GET") {
  return new Request(`https://hxhstatus.com${path}`, { method, headers });
}

test("an explicit choice in the cookie decides the language", () => {
  const chosen = request("/", { Cookie: `${LOCALE_COOKIE}=ja; other=1` });
  assert.equal(cookieLocale(chosen), "ja");
  assert.equal(negotiateLocale(chosen), "ja");
});

test("a cookie naming an unpublished locale is ignored", () => {
  const bogus = request("/", { Cookie: `${LOCALE_COOKIE}=klingon` });
  assert.equal(cookieLocale(bogus), null);
  assert.equal(negotiateLocale(bogus), "en");
});

test("the browser's language never moves a reader off /", () => {
  // Redirecting by Accept-Language sends a crawler asking for the canonical
  // English page to a translation of it, and leaves a reader who types the
  // domain unable to reach "/". Only the reader's own choice redirects.
  for (const header of ["fr", "pt-BR", "zh-Hans-CN", "sv, fr;q=0.8", "*"]) {
    const asked = request("/", { "Accept-Language": header });
    assert.equal(negotiateLocale(asked), "en");
    assert.equal(localeRedirect(asked), null);
  }
});

test("no header at all is English", () => {
  assert.equal(negotiateLocale(request("/")), "en");
  assert.equal(localeRedirect(request("/")), null);
});

test("a remembered choice gets a 302 that preserves the query", () => {
  const response = localeRedirect(
    request("/?utm_source=x", {
      "Accept-Language": "en-GB",
      Cookie: `${LOCALE_COOKIE}=fr`,
    }),
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "/fr?utm_source=x");
  assert.equal(response.headers.get("Vary"), "Cookie");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("only the root is negotiated", () => {
  for (const path of ["/fr", "/ja", "/hiatus", "/chapter/421", "/status.json"]) {
    assert.equal(
      localeRedirect(request(path, { Cookie: `${LOCALE_COOKIE}=fr` })),
      null,
    );
  }
});

test("non-idempotent methods are left alone", () => {
  assert.equal(
    localeRedirect(request("/", { Cookie: `${LOCALE_COOKIE}=fr` }, "POST")),
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
