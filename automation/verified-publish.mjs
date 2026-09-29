import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const runGit = async (args) => (await exec("git", args)).stdout.trim();
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// main requires the real CI `verify` check on the exact commit being pushed.
// GITHUB_TOKEN pushes do not trigger CI, so dispatch it explicitly on a unique
// temporary branch, then fast-forward main only after that run succeeds.
export async function publishVerifiedCommit({
  repository, token, runId, runAttempt,
  git = runGit, fetchImpl = fetch, wait = pause, now = Date.now,
  timeoutMs = 15 * 60_000,
}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") || !token ||
      !/^\d+$/.test(runId ?? "") || !/^\d+$/.test(runAttempt ?? "")) {
    throw new Error("Verified publication requires the GitHub repository, token, run ID and attempt.");
  }
  const sha = await git(["rev-parse", "HEAD"]);
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("Invalid commit for verification.");
  const verificationBranch = `automation/verify-${runId}-${runAttempt}-${sha.slice(0, 12)}`;
  const api = `https://api.github.com/repos/${repository}`;
  const request = async (path, options = {}) => {
    const response = await fetchImpl(`${api}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "hxh-status-automation",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`CI verification request failed (${response.status}).`);
    return response;
  };

  await git(["push", "origin", `${sha}:refs/heads/${verificationBranch}`]);
  try {
    await request("/actions/workflows/ci.yml/dispatches", {
      method: "POST", body: JSON.stringify({ ref: verificationBranch }),
    });
    const deadline = now() + timeoutMs;
    while (now() < deadline) {
      const query = new URLSearchParams({
        branch: verificationBranch, head_sha: sha,
        event: "workflow_dispatch", per_page: "5",
      });
      const response = await request(`/actions/workflows/ci.yml/runs?${query}`);
      const body = await response.json();
      if (!Array.isArray(body.workflow_runs)) throw new Error("Invalid CI verification response.");
      const run = body.workflow_runs.find((candidate) =>
        candidate.head_sha === sha && candidate.head_branch === verificationBranch);
      if (run?.status === "completed") {
        if (run.conclusion !== "success") throw new Error(`CI verification did not pass (${run.conclusion}).`);
        // Pin the verified SHA even if another local command moved HEAD.
        await git(["push", "origin", `${sha}:refs/heads/main`]);
        return { sha, runId: run.id };
      }
      await wait(10_000);
    }
    throw new Error("CI verification timed out; main was not updated.");
  } finally {
    try {
      await git(["push", "origin", "--delete", verificationBranch]);
    } catch {
      console.warn(`Could not remove verification branch ${verificationBranch}.`);
    }
  }
}
