import { createHash } from "node:crypto";

// Content revisions, unlike build timestamps, preserve conditional caching.
export function contentRevision(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildChapterDetails({ statusData, historyData, titles, volumes, posts }) {
  const arcs = new Map(historyData.filter((row) => Number.isInteger(row.chapter) && row.arc)
    .map((row) => [row.chapter, row.arc]));
  const latestHistorical = Math.max(0, ...arcs.keys());
  return [...statusData.chapters].sort((a, b) => a.chapter - b.chapter).map((record) => ({
    ...record,
    titles: Object.fromEntries(Object.entries(titles).map(([locale, table]) => [locale, table[record.chapter] ?? null])),
    // Do not present the site's projected volume numbers as confirmed metadata.
    volume: volumes.volumes.find((v) => record.chapter >= v.from && record.chapter <= v.to)?.volume ?? null,
    arc: arcs.get(record.chapter) ?? (record.chapter > latestHistorical ? arcs.get(latestHistorical) : null) ?? null,
    arcInferred: !arcs.has(record.chapter) && record.chapter > latestHistorical && latestHistorical > 0,
    releaseAt: record.releaseAt ?? null,
    updatedAt: record.updatedAt ?? null,
    source: record.source ?? null,
    relatedPostIds: posts.filter((post) => post.tracker.changes.some((change) => change.chapter === record.chapter))
      .map((post) => post.id).sort(),
  }));
}

export function buildEvents(statusData, posts) {
  const events = new Map();
  for (const post of posts) {
    if (post.tracker.decision !== "apply") continue;
    for (const change of post.tracker.changes) {
      const id = `post-${post.id}-chapter-${change.chapter}-${change.from}-${change.to}`;
      events.set(id, { id, kind: "transition", date: post.createdAt, chapter: change.chapter,
        from: change.from, to: change.to, source: post.url, postId: post.id });
    }
  }
  for (const row of statusData.chapters) {
    if (row.status === "unknown") continue;
    const postId = row.sourcePostId ?? row.source?.match(/\/status\/(\d+)/)?.[1] ?? null;
    if ([...events.values()].some((event) => event.chapter === row.chapter && event.to === row.status && event.postId === postId && postId !== null)) continue;
    // A release date is an occurrence only once published, not when scheduled.
    const date = row.status === "published" ? row.releaseAt ?? row.updatedAt : row.updatedAt;
    if (!date) continue;
    const id = `chapter-${row.chapter}-${row.status}`;
    events.set(id, { id, kind: "observation", date, chapter: row.chapter,
      from: null, to: row.status, source: row.source ?? null, postId });
  }
  return [...events.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id));
}
