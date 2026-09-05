import schedule from "../automation/publication-schedule.json" with { type: "json" };
import { duePublications } from "../automation/publication.mjs";
import { dispatchPublicationWorkflow, fetchAutomationState, hasActiveAutomationRun } from "./github.mjs";

export async function dispatchDuePublications(env, now = Date.now(), fetchImpl = fetch) {
  if (env.AUTOMATION_ENABLED !== "true") return;
  // Retry for a week after the release; otherwise this task does no I/O.
  const due = duePublications(schedule, now).filter((r) => now < Date.parse(r.releaseAt) + 7 * 86_400_000);
  if (!due.length) return;
  const key = `publication:completed:${due.map((r) => r.chapter).join("-")}`;
  if (await env.X_EVENT_STATE.get(key)) return;
  const config = {
    token: env.GITHUB_AUTOMATION_TOKEN,
    repository: env.GITHUB_REPOSITORY,
    branch: env.GITHUB_BRANCH,
    workflowFile: "publication-status.yml",
  };
  const state = await fetchAutomationState({ ...config, statePath: "automation/publication-state.json" }, fetchImpl);
  if (!Array.isArray(state.completed)) throw new Error("Invalid publication completion state.");
  if (due.every((r) => state.completed.includes(r.chapter))) {
    await env.X_EVENT_STATE.put(key, "1", { expirationTtl: 8 * 86_400 });
    return;
  }
  if (await hasActiveAutomationRun(config, fetchImpl)) return;
  await dispatchPublicationWorkflow(config, fetchImpl);
}
