import { appendFile, readFile, rename, writeFile } from "node:fs/promises";
import { applyScheduledPublications } from "../automation/publication.mjs";

const dataPath = "app/data/status-data.json";
const statePath = "automation/publication-state.json";
const [data, schedule, state] = await Promise.all(
  [dataPath, "automation/publication-schedule.json", statePath]
    .map(async (path) => JSON.parse(await readFile(path, "utf8"))),
);

async function save(path, value) {
  await writeFile(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${path}.tmp`, path);
}

const result = applyScheduledPublications(data, schedule, state.completed);
if (process.argv.includes("--complete")) {
  // The workflow only calls this after public-state verification and successful delivery.
  if (result.changed) throw new Error("Cannot complete a publication that has not been committed.");
  await save(statePath, { completed: [...new Set([...state.completed, ...result.releases.map((r) => r.chapter)])] });
} else if (!process.argv.includes("--check")) {
  if (result.changed) await save(dataPath, result.statusData);
  if (result.releases.length > 0) {
    if (!process.env.AUTOMATION_VERDICT_FILE) throw new Error("AUTOMATION_VERDICT_FILE is required.");
    await save(process.env.AUTOMATION_VERDICT_FILE, result.verdict);
  }
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT,
      `status_changed=${result.changed}\npublication_due=${result.releases.length > 0}\n`);
  }
}
console.log(JSON.stringify({ changed: result.changed, due: result.releases.map((r) => r.chapter) }));
