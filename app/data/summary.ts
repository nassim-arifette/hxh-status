import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { formatDate } from "../status-presentation";
import { deriveArcStats } from "./arcs";
import { deriveHiatusStats, type PublicationIssueInput } from "./hiatus-stats";
import historyData from "./publication-history.json";
import statusData from "./status-data.json";
import {
  lastUpdated,
  latestPublished,
  manuscriptsComplete,
  nextChapter,
  publicationStatus,
  workConfirmed,
} from "./status";

// The tracker's facts already exist as numbers and chart cells. Search engines,
// AI overviews and assistants quote sentences, so the same numbers are composed
// into prose once, at build time, and reused for the document title, the meta
// description, the visible lede and the structured data. One source means the
// sentence a crawler reads can never contradict the chart beside it.

export const hiatusStats = deriveHiatusStats(
  historyData as PublicationIssueInput[],
  statusData,
);

// Derived once for the whole build: the home page, the statistics page and the
// arc page all read the same object rather than recomputing 1,370 rows each.
export const arcStats = deriveArcStats(historyData as PublicationIssueInput[]);

const longDate = { month: "long", day: "numeric", year: "numeric" } as const;
// formatDate defaults to a day-precision date, so the day is cleared: the
// title should age by month, not force a new title every single day.
const monthYear = { day: undefined, month: "short", year: "numeric" } as const;

function statusLabel(
  messages: Messages,
  status: keyof Messages["statuses"],
) {
  return messages.statuses[status].label;
}

function statusSentence(locale: Locale, messages: Messages) {
  return formatMessage(
    publicationStatus === "hiatus"
      ? messages.summary.statusHiatus
      : messages.summary.statusPublishing,
    { date: formatDate(lastUpdated, longDate, locale) },
  );
}

function latestSentence(locale: Locale, messages: Messages) {
  const date = latestPublished.releaseAt
    ? formatDate(latestPublished.releaseAt.slice(0, 10), longDate, locale)
    : formatDate(lastUpdated, longDate, locale);

  return latestPublished.jumpIssue
    ? formatMessage(messages.summary.latestPublished, {
        chapter: latestPublished.chapter,
        issue: latestPublished.jumpIssue,
        date,
      })
    : formatMessage(messages.summary.latestPublishedNoIssue, {
        chapter: latestPublished.chapter,
        date,
      });
}

// The three branches mirror how much the public record actually supports: a
// date Jump announced, a manuscript Togashi says he has handed in, or a stage
// short of that. Nothing here infers a date the sources have not given.
function nextSentence(locale: Locale, messages: Messages) {
  const chapter = nextChapter.chapter;

  if (nextChapter.status === "scheduled" && nextChapter.releaseAt) {
    return formatMessage(messages.summary.nextScheduled, {
      chapter,
      date: formatDate(nextChapter.releaseAt.slice(0, 10), longDate, locale),
    });
  }

  if (manuscriptsComplete.chapter >= chapter && manuscriptsComplete.updatedAt) {
    return formatMessage(messages.summary.nextDelivered, {
      chapter,
      through: manuscriptsComplete.chapter,
      confirmedOn: formatDate(manuscriptsComplete.updatedAt, longDate, locale),
    });
  }

  if (workConfirmed.chapter >= chapter && workConfirmed.updatedAt) {
    return formatMessage(messages.summary.nextInProgress, {
      chapter,
      through: workConfirmed.chapter,
      confirmedOn: formatDate(workConfirmed.updatedAt, longDate, locale),
    });
  }

  return formatMessage(messages.summary.nextUnknown, { chapter });
}

export function buildStatusSentences(locale: Locale, messages: Messages) {
  return [
    statusSentence(locale, messages),
    latestSentence(locale, messages),
    nextSentence(locale, messages),
  ];
}

export function buildHomeTitle(locale: Locale, messages: Messages) {
  return formatMessage(
    publicationStatus === "hiatus"
      ? messages.metadata.homeTitleHiatus
      : messages.metadata.homeTitlePublishing,
    {
      latest: latestPublished.chapter,
      next: nextChapter.chapter,
      month: formatDate(lastUpdated, monthYear, locale),
    },
  );
}

export function buildHomeDescription(locale: Locale, messages: Messages) {
  return buildStatusSentences(locale, messages).join(" ");
}

export { statusLabel };
