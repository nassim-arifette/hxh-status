import { publishVerifiedCommit } from "../automation/verified-publish.mjs";

const result = await publishVerifiedCommit({
  repository: process.env.GITHUB_REPOSITORY,
  token: process.env.GH_TOKEN,
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT,
});

console.log(`Published ${result.sha} after CI run ${result.runId} succeeded.`);
