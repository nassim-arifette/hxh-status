const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_TIMEOUT_MS = 15_000;
const MAX_STATE_BYTES = 100_000;
const ACTIVE_RUN_STATUSES = new Set([
  "queued",
  "in_progress",
  "waiting",
  "requested",
  "pending",
]);

function repositoryParts(repository) {
  if (
    typeof repository !== "string" ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
  ) {
    throw new Error("GITHUB_REPOSITORY must use the owner/repository format.");
  }

  return repository.split("/");
}

function githubHeaders(token, accept) {
  if (!token) throw new Error("GITHUB_AUTOMATION_TOKEN is not configured.");

  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "hxhstatus-automation",
  };
}

async function responseText(response, maxBytes) {
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new Error("GitHub response exceeded the safety size limit.");
  }
  return text;
}

async function errorMessage(response) {
  return (await responseText(response, 2_000))
    .slice(0, 500)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ");
}

function githubFetch(url, options, fetchImpl) {
  return fetchImpl(url, {
    ...options,
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
}

export async function fetchAutomationState(
  { token, repository, branch, statePath = "automation/state.json" },
  fetchImpl = fetch,
) {
  const [owner, repo] = repositoryParts(repository);
  const encodedPath = statePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const url =
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}` +
    `?ref=${encodeURIComponent(branch)}`;
  const response = await githubFetch(
    url,
    {
      headers: githubHeaders(token, "application/vnd.github.raw+json"),
      cache: "no-store",
    },
    fetchImpl,
  );

  if (!response.ok) {
    throw new Error(
      `GitHub state request failed (${response.status}): ${await errorMessage(response)}`,
    );
  }

  return JSON.parse(await responseText(response, MAX_STATE_BYTES));
}

export async function hasActiveAutomationRun(
  { token, repository, branch, workflowFile },
  fetchImpl = fetch,
) {
  const [owner, repo] = repositoryParts(repository);
  const url =
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/` +
    `${encodeURIComponent(workflowFile)}/runs?branch=` +
    `${encodeURIComponent(branch)}&per_page=20`;
  const response = await githubFetch(
    url,
    { headers: githubHeaders(token, "application/vnd.github+json") },
    fetchImpl,
  );

  if (!response.ok) {
    throw new Error(
      `GitHub runs request failed (${response.status}): ${await errorMessage(response)}`,
    );
  }

  const body = JSON.parse(await responseText(response, MAX_STATE_BYTES));
  if (!Array.isArray(body.workflow_runs)) {
    throw new Error("GitHub runs response is missing workflow_runs.");
  }

  return body.workflow_runs.some((run) => ACTIVE_RUN_STATUSES.has(run?.status));
}

export async function dispatchAutomationWorkflow(
  { token, repository, branch, workflowFile, payload },
  fetchImpl = fetch,
) {
  const [owner, repo] = repositoryParts(repository);
  const url =
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/` +
    `${encodeURIComponent(workflowFile)}/dispatches`;
  const response = await githubFetch(
    url,
    {
      method: "POST",
      headers: {
        ...githubHeaders(token, "application/vnd.github+json"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: branch,
        inputs: { payload: JSON.stringify(payload) },
      }),
    },
    fetchImpl,
  );

  if (response.status !== 204) {
    throw new Error(
      `GitHub workflow dispatch failed (${response.status}): ${await errorMessage(response)}`,
    );
  }
}
