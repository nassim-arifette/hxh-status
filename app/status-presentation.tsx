import type { ComponentType } from "react";
import {
  CalendarDays,
  Check,
  CircleDashed,
  PanelsTopLeft,
  PenLine,
  Send,
} from "lucide-react";

import type { Locale, Messages } from "@/lib/i18n";
import type { ChapterStatus } from "./data/status";

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>;

export type StatusMeta = {
  label: string;
  shortLabel: string;
  description: string;
  icon: Icon;
};

export function getStatusMeta(
  messages: Messages["statuses"],
): Record<ChapterStatus, StatusMeta> {
  return {
    published: {
      ...messages.published,
      icon: Check,
    },
    scheduled: {
      ...messages.scheduled,
      icon: CalendarDays,
    },
    delivered: {
      ...messages.delivered,
      icon: Send,
    },
    background: {
      ...messages.background,
      icon: PanelsTopLeft,
    },
    inking: {
      ...messages.inking,
      icon: PenLine,
    },
    unknown: {
      ...messages.unknown,
      icon: CircleDashed,
    },
  };
}

// Status labels read as sentence fragments after "Chapter 427 …", but only the
// first letter may drop case: "Delivered to Jump" has to keep its capital J.
export function lowerFirst(label: string) {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function formatDate(
  date?: string,
  options?: Intl.DateTimeFormatOptions,
  locale: Locale = "en",
) {
  if (!date) return "Not confirmed";

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatLocalDate(
  dateTime: string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
  locale: Locale = "en",
) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(dateTime));
}
