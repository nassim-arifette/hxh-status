import {
  AUTO_STATUSES,
  AUTOMATION_SCHEMA_VERSION,
  STATUS_RANK,
  TOGASHI_SOURCE_LABEL,
  TRACKER_STATUSES,
  compareSnowflakeIds,
  evaluateAnalysis,
  validateAutomationPayload,
} from "./contracts.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateStatusData(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof value.lastUpdated !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.lastUpdated) ||
    !Array.isArray(value.chapters)
  ) {
    throw new Error("Invalid tracker status data.");
  }

  const chapters = new Set();

  for (const record of value.chapters) {
    if (
      typeof record !== "object" ||
      record === null ||
      !Number.isInteger(record.chapter) ||
      !TRACKER_STATUSES.includes(record.status) ||
      chapters.has(record.chapter)
    ) {
      throw new Error("Tracker chapters must be unique and valid.");
    }

    chapters.add(record.chapter);
  }

  return value;
}

function validateState(value, listId) {
  if (
    typeof value !== "object" ||
    value === null ||
    value.schemaVersion !== AUTOMATION_SCHEMA_VERSION ||
    value.listId !== listId ||
    typeof value.lastProcessedTweetId !== "string" ||
    !Array.isArray(value.recentEvents) ||
    !Array.isArray(value.pendingReviews)
  ) {
    throw new Error("Invalid automation state.");
  }

  compareSnowflakeIds(value.lastProcessedTweetId, value.lastProcessedTweetId);
  return value;
}

function reviewEntry(tweet, reason, explanation) {
  return {
    tweetId: tweet.id,
    tweetUrl: tweet.url,
    createdAt: tweet.createdAt,
    reason,
    explanation,
  };
}

function auditEntry(tweet, decision, reason, changes) {
  return {
    tweetId: tweet.id,
    tweetUrl: tweet.url,
    createdAt: tweet.createdAt,
    decision,
    reason,
    changes,
  };
}

export function applyAnalyzedEvents({
  statusData: rawStatusData,
  state: rawState,
  payload: rawPayload,
  analyzedEvents,
}) {
  const payload = validateAutomationPayload(rawPayload);
  const statusData = clone(validateStatusData(rawStatusData));
  const state = clone(validateState(rawState, payload.listId));

  if (!Array.isArray(analyzedEvents)) {
    throw new Error("analyzedEvents must be an array.");
  }

  const analysisByTweetId = new Map();

  for (const event of analyzedEvents) {
    if (
      typeof event !== "object" ||
      event === null ||
      typeof event.tweetId !== "string" ||
      analysisByTweetId.has(event.tweetId)
    ) {
      throw new Error("Invalid or duplicate analyzed event.");
    }

    analysisByTweetId.set(event.tweetId, event);
  }

  const tweets = [...payload.tweets].sort((left, right) =>
    compareSnowflakeIds(left.id, right.id),
  );
  const reviewItems = [];
  let statusChanged = false;
  let stateChanged = false;

  for (const tweet of tweets) {
    if (compareSnowflakeIds(tweet.id, state.lastProcessedTweetId) <= 0) {
      continue;
    }

    const analyzed = analysisByTweetId.get(tweet.id);
    if (!analyzed) {
      throw new Error(`Missing Gemini analysis for tweet ${tweet.id}.`);
    }

    let evaluation = evaluateAnalysis(tweet, analyzed.analysis);
    const changes = [];

    if (evaluation.decision === "apply") {
      const plannedChanges = [];

      for (const update of evaluation.updates) {
        if (!AUTO_STATUSES.includes(update.proposedStatus)) {
          throw new Error("Reducer received a protected status.");
        }

        const record = statusData.chapters.find(
          (chapter) => chapter.chapter === update.chapter,
        );

        if (!record) {
          evaluation = {
            decision: "review",
            reason: `Chapter ${update.chapter} is not tracked.`,
            updates: [],
          };
          break;
        }

        if (STATUS_RANK[update.proposedStatus] <= STATUS_RANK[record.status]) {
          continue;
        }

        plannedChanges.push({ record, update });
      }

      if (evaluation.decision === "apply") {
        const updatedAt = new Date(tweet.createdAt).toISOString().slice(0, 10);

        for (const { record, update } of plannedChanges) {
          changes.push({
            chapter: record.chapter,
            from: record.status,
            to: update.proposedStatus,
          });

          record.status = update.proposedStatus;
          record.updatedAt = updatedAt;
          record.source = tweet.url;
          record.sourceLabel = TOGASHI_SOURCE_LABEL;
          record.sourceType = "togashi-x";
          record.sourcePostId = tweet.id;
          record.sourcePublishedAt = tweet.createdAt;
        }

        if (changes.length === 0) {
          evaluation = {
            decision: "ignore",
            reason: "The tracker already contains an equal or later milestone.",
            updates: [],
          };
        } else {
          statusData.lastUpdated =
            updatedAt > statusData.lastUpdated
              ? updatedAt
              : statusData.lastUpdated;
          statusChanged = true;
        }
      }
    }

    if (evaluation.decision === "review") {
      const item = reviewEntry(
        tweet,
        evaluation.reason,
        analyzed.analysis.explanation,
      );
      reviewItems.push(item);

      if (
        !state.pendingReviews.some(
          (review) => review.tweetId === tweet.id,
        )
      ) {
        state.pendingReviews.push(item);
        state.pendingReviews = state.pendingReviews.slice(-50);
      }
    }

    state.recentEvents.push(
      auditEntry(tweet, evaluation.decision, evaluation.reason, changes),
    );
    state.recentEvents = state.recentEvents.slice(-50);
    state.lastProcessedTweetId = tweet.id;
    state.lastProcessedAt = tweet.createdAt;
    state.lastRunAt = payload.requestedAt;
    stateChanged = true;
  }

  return {
    statusData,
    state,
    statusChanged,
    stateChanged,
    reviewItems,
  };
}
