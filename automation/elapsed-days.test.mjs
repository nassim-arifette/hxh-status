import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { LOCAL_DATE_SCRIPT } from "../app/local-date.ts";

test("an open static page advances elapsed days at Japan midnight without a rebuild", () => {
  let now = Date.parse("2026-09-12T14:59:59Z");
  class ClockDate extends Date { static now() { return now; } }
  const node = {
    textContent: "0 jours écoulés",
    getAttribute(name) {
      return { "data-elapsed-since": "2026-09-07", "data-days-template": "{days} jours écoulés · 0 numéros recensés" }[name];
    },
  };
  let refresh;
  runInNewContext(LOCAL_DATE_SCRIPT, {
    Date: ClockDate, Intl,
    document: { documentElement: { lang: "fr" }, querySelectorAll: selector => selector === "[data-elapsed-since]" ? [node] : [] },
    setInterval(callback, milliseconds) { assert.equal(milliseconds, 60000); refresh = callback; },
  });
  assert.equal(node.textContent, "5 jours écoulés · 0 numéros recensés");
  now = Date.parse("2026-09-12T15:00:01Z");
  refresh();
  assert.equal(node.textContent, "6 jours écoulés · 0 numéros recensés");
});
