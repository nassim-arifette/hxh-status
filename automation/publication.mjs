import { trackerMilestones, trackerRevision, publicationState } from "./milestones.mjs";

export function duePublications(schedule, now = Date.now()) {
  if (!Number.isFinite(now) || !Array.isArray(schedule?.releases)) {
    throw new TypeError("Invalid publication schedule.");
  }
  const seen = new Set();
  return schedule.releases.filter((release) => {
    const at = Date.parse(release.releaseAt);
    const prepare = Date.parse(release.prepareAt);
    if (!Number.isInteger(release.chapter) || release.chapter < 1 || release.chapter > 9999 ||
        seen.has(release.chapter) || typeof release.hiatus !== "boolean" ||
        !/(?:Z|[+-]\d{2}:\d{2})$/.test(release.releaseAt) ||
        !/(?:Z|[+-]\d{2}:\d{2})$/.test(release.prepareAt) ||
        !Number.isFinite(at) || !Number.isFinite(prepare) ||
        prepare > at || at - prepare > 180_000) {
      throw new TypeError("Invalid scheduled publication.");
    }
    seen.add(release.chapter);
    return now >= prepare;
  });
}

export function applyScheduledPublications(statusData, schedule, completed, now = Date.now()) {
  if (!Array.isArray(completed) || completed.some((id) => !Number.isInteger(id))) {
    throw new TypeError("Invalid publication completion state.");
  }
  const next = structuredClone(statusData);
  const releases = duePublications(schedule, now).filter((release) => !completed.includes(release.chapter));
  for (const release of releases) {
    const record = next.chapters.find((row) => row.chapter === release.chapter);
    if (!record || !["scheduled", "published"].includes(record.status) ||
        Date.parse(record.releaseAt) !== Date.parse(release.releaseAt) ||
        record.sourceType !== "official-reader" ||
        (release.hiatus && next.hiatusAfterChapter !== release.chapter)) {
      throw new Error(`Chapter ${release.chapter} no longer matches the approved publication schedule.`);
    }
    record.status = "published";
    // Keep the official release date (Japan), even when preparation starts 3 minutes early.
    const date = new Date(Date.parse(release.releaseAt) + 9 * 3_600_000).toISOString().slice(0, 10);
    record.updatedAt = date;
    if (next.lastUpdated < date) next.lastUpdated = date;
  }
  const milestones = trackerMilestones(statusData, next);
  // A previous run may have pushed data before a build/verdict failure. Replay
  // its verdict until acknowledged; the Worker's milestone ledger deduplicates it.
  for (const release of releases) {
    if (!milestones.chapters.some((entry) => entry.chapter === release.chapter)) {
      milestones.chapters.push({ chapter: release.chapter, from: "scheduled", to: "published" });
    }
    if (release.hiatus && publicationState(next) === "hiatus") {
      milestones.publication = { from: "publishing", to: "hiatus" };
    }
  }
  return {
    statusData: next,
    changed: JSON.stringify(next) !== JSON.stringify(statusData),
    releases,
    verdict: { requestedAt: new Date(now).toISOString(), revision: trackerRevision(next), posts: [], milestones },
  };
}
