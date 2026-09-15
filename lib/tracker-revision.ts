type TrackerRevisionData = {
  lastUpdated: string;
  hiatusAfterChapter?: number;
  chapters: readonly { chapter: number }[];
};

// A cache fingerprint, shared by the site and automation. Sorting rows and
// fields makes it independent of JSON formatting and insertion order. Every
// chapter contributes, including an older post recovered after a newer one.
export function createTrackerRevision(statusData: TrackerRevisionData, sourceBase: string): string {
  const chapters = [...statusData.chapters]
    .sort((left, right) => left.chapter - right.chapter)
    .map((chapter) => Object.fromEntries(Object.entries(chapter)
      .sort(([left], [right]) => left.localeCompare(right))));
  const content = JSON.stringify([
    statusData.lastUpdated,
    statusData.hiatusAfterChapter ?? null,
    chapters,
  ]);

  // FNV-1a at 64 bits keeps revisions within the Worker's 40-character limit
  // without requiring Node crypto in the site's shared data module.
  let fingerprint = BigInt("0xcbf29ce484222325");
  const prime = BigInt("0x100000001b3");
  for (let index = 0; index < content.length; index += 1) {
    const character = content.charCodeAt(index);
    for (const byte of [character & 0xff, character >>> 8]) {
      fingerprint = BigInt.asUintN(64, (fingerprint ^ BigInt(byte)) * prime);
    }
  }

  return `${sourceBase}-${fingerprint.toString(16).padStart(16, "0")}`;
}
