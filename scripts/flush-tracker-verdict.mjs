import { execFile } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { trackerRevision, publicationState } from "../automation/milestones.mjs";

const statePath = "automation/state.json";
const state = JSON.parse(await readFile(statePath, "utf8"));
if (!state.pendingVerdict) throw new Error("No committed verdict is pending.");
const status = JSON.parse(await readFile("app/data/status-data.json", "utf8"));
const verdict = structuredClone(state.pendingVerdict.verdict);
verdict.requestedAt = new Date().toISOString();
verdict.revision = trackerRevision(status);
// A later official publication may have superseded the inferred publication
// transition while this delivery was waiting. Do not announce a stale hiatus.
if (verdict.milestones.publication?.to !== publicationState(status)) verdict.milestones.publication = null;
await writeFile(process.env.AUTOMATION_VERDICT_FILE, JSON.stringify(verdict));
for (const script of ["wait-for-tracker-deployment", "notify-tracker-verdict"]) {
  const result = await promisify(execFile)(process.execPath, [`scripts/${script}.mjs`], { timeout: 14 * 60_000 });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
}
// Clear only after deployment verification AND notification acceptance. If a
// job dies before this commit, the Worker safely deduplicates the next replay.
delete state.pendingVerdict;
await writeFile(`${statePath}.tmp`, `${JSON.stringify(state, null, 2)}\n`);
await rename(`${statePath}.tmp`, statePath);
