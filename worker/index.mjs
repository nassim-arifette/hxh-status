import {
  AUTOMATION_SCHEMA_VERSION,
  TOGASHI_USER_ID,
  assertSnowflakeId,
  validateAutomationPayload,
} from "../automation/contracts.mjs";
import {
  dispatchAutomationWorkflow,
  fetchAutomationState,
  hasActiveAutomationRun,
} from "./github.mjs";
import { fetchTimelineTweets, selectUnseenTweets } from "./x-timeline.mjs";
import { handlePushApi, runPushNotifications } from "./push-notifications.mjs";

export { PushSubscriptionRegistry } from "./push-subscription-registry.mjs";

const MAX_DISPATCH_BYTES = 50_000;
const MAX_TWEETS_PER_RUN = 5;

function requiredEnv(env, name) {
  const value = env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}
function buildPayload({ listId, authorId, tweets }) {
  const requestedAt = new Date().toISOString();
  const selected = [];

  for (const tweet of tweets) {
    const candidate = {
      schemaVersion: AUTOMATION_SCHEMA_VERSION,
      listId,
      authorId,
      requestedAt,
      tweets: [...selected, tweet],
    };
    const byteLength = new TextEncoder().encode(JSON.stringify(candidate)).byteLength;

    if (byteLength > MAX_DISPATCH_BYTES) {
      if (selected.length === 0) {
        throw new Error("One X post exceeds the safe GitHub dispatch size.");
      }
      break;
    }

    selected.push(tweet);
  }

  return validateAutomationPayload({
    schemaVersion: AUTOMATION_SCHEMA_VERSION,
    listId,
    authorId,
    requestedAt,
    tweets: selected,
  });
}

export async function runAutomation(env, fetchImpl = fetch, timelineLoader) {
  if (env.AUTOMATION_ENABLED !== "true") {
    console.log("Togashi automation is disabled.");
    return { dispatched: false, count: 0 };
  }

  const listId = requiredEnv(env, "TOGASHI_LIST_ID");
  const expectedUserId = requiredEnv(env, "TOGASHI_USER_ID");
  const repository = requiredEnv(env, "GITHUB_REPOSITORY");
  const branch = requiredEnv(env, "GITHUB_BRANCH");
  const workflowFile = requiredEnv(env, "GITHUB_WORKFLOW_FILE");
  const token = requiredEnv(env, "GITHUB_AUTOMATION_TOKEN");

  assertSnowflakeId(listId, "TOGASHI_LIST_ID");
  if (expectedUserId !== TOGASHI_USER_ID) {
    throw new Error("TOGASHI_USER_ID does not match the validated account.");
  }

  const githubConfig = { token, repository, branch, workflowFile };
  if (await hasActiveAutomationRun(githubConfig, fetchImpl)) {
    console.log("Togashi automation skipped: the GitHub workflow is still active.");
    return { dispatched: false, count: 0, busy: true };
  }

  const loadTimeline =
    timelineLoader ??
    (() =>
      fetchTimelineTweets(
        { listId, expectedUserId },
        fetchImpl,
      ));
  const state = await fetchAutomationState(githubConfig, fetchImpl);

  if (
    state?.schemaVersion !== AUTOMATION_SCHEMA_VERSION ||
    state?.listId !== listId
  ) {
    throw new Error("Repository automation state does not match this list.");
  }

  if (state.pendingVerdict) {
    const payload = validateAutomationPayload({
      ...state.pendingVerdict.payload, requestedAt: new Date().toISOString(),
    });
    if (env.AUTOMATION_DRY_RUN === "true") return { dispatched: false, count: 0, pendingVerdict: true };
    await dispatchAutomationWorkflow({
      ...githubConfig, payload, payloadSecret: requiredEnv(env, "AUTOMATION_PAYLOAD_SECRET"),
    }, fetchImpl);
    return { dispatched: true, count: 0, pendingVerdict: true };
  }

  const tweets = await loadTimeline();

  const unseen = selectUnseenTweets(
    tweets,
    state.lastProcessedTweetId,
    MAX_TWEETS_PER_RUN,
  );

  if (unseen.length === 0) {
    console.log("Togashi timeline checked: no new posts.");
    return { dispatched: false, count: 0 };
  }

  const payload = buildPayload({
    listId,
    authorId: expectedUserId,
    tweets: unseen,
  });

  if (env.AUTOMATION_DRY_RUN === "true") {
    console.log(
      `Dry run: would dispatch ${payload.tweets.length} Togashi post(s), ` +
        `${payload.tweets[0].id} through ${payload.tweets.at(-1).id}.`,
    );
    return { dispatched: false, count: payload.tweets.length };
  }

  const payloadSecret = requiredEnv(env, "AUTOMATION_PAYLOAD_SECRET");

  await dispatchAutomationWorkflow(
    { ...githubConfig, payload, payloadSecret },
    fetchImpl,
  );

  console.log(
    `Dispatched ${payload.tweets.length} Togashi post(s), ` +
      `${payload.tweets[0].id} through ${payload.tweets.at(-1).id}.`,
  );
  return { dispatched: true, count: payload.tweets.length };
}

const worker = {
  async fetch(request, env) {
    const pushResponse = await handlePushApi(request, env);
    return pushResponse ?? env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env) {
    // This is deliberately a fallback. Real-time X Activity events are handled
    // by the dedicated togashi-events Worker; syndication repairs missed events.
    let timelinePromise;
    const timelineLoader = () => {
      timelinePromise ??= fetchTimelineTweets(
        {
          listId: requiredEnv(env, "TOGASHI_LIST_ID"),
          expectedUserId: requiredEnv(env, "TOGASHI_USER_ID"),
        },
        fetch,
      );
      return timelinePromise;
    };

    const results = await Promise.allSettled([
      runAutomation(env, fetch, timelineLoader),
      runPushNotifications(env, fetch, timelineLoader),
    ]);
    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (errors.length > 0) {
      throw new AggregateError(errors, "One or more scheduled tasks failed.");
    }
  },
};

export default worker;
