import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_PAGES, isContentRoute } from '../lib/routes.ts';

test('history is discoverable but keeps the runtime needed by its chart', () => {
  assert.ok(CONTENT_PAGES.includes('history'));
  for (const prefix of ['', '/fr', '/ar', '/ja']) {
    assert.equal(isContentRoute(`${prefix}/history`, ['fr', 'ar', 'ja']), false);
    assert.equal(isContentRoute(`${prefix}/statistics`, ['fr', 'ar', 'ja']), true);
  }
});

test('community predictions keep their runtime in every localized export', () => {
  assert.ok(CONTENT_PAGES.includes('predictions'));
  for (const prefix of ['', '/fr', '/ar', '/ja']) {
    assert.equal(isContentRoute(`${prefix}/predictions`, ['fr', 'ar', 'ja']), false);
  }
});
