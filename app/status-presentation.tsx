import type { ComponentType } from "react";
import {
  CalendarDays,
  Check,
  CircleDashed,
  PanelsTopLeft,
  PenLine,
  Send,
} from "lucide-react";

import type { ChapterStatus } from "./data/status";

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>;

type StatusMeta = {
  label: string;
  shortLabel: string;
  description: string;
  icon: Icon;
};

export const statusMeta: Record<ChapterStatus, StatusMeta> = {
  published: {
    label: "Published",
    shortLabel: "Published",
    description: "Officially released to readers.",
    icon: Check,
  },
  scheduled: {
    label: "Scheduled for publication",
    shortLabel: "Scheduled",
    description: "Jump has scheduled this chapter for publication.",
    icon: CalendarDays,
  },
  delivered: {
    label: "Delivered to Jump",
    shortLabel: "At Jump",
    description:
      "The finished manuscript has been delivered to Jump, but it is not published yet.",
    icon: Send,
  },
  background: {
    label: "Background specifications complete",
    shortLabel: "Backgrounds",
    description:
      "Instructions for backgrounds and supporting production work are complete.",
    icon: PanelsTopLeft,
  },
  inking: {
    label: "Character inking complete",
    shortLabel: "Inked",
    description:
      "Character linework is complete; later production steps remain.",
    icon: PenLine,
  },
  unknown: {
    label: "No confirmed production update",
    shortLabel: "Unknown",
    description: "No precise public production milestone has been confirmed.",
    icon: CircleDashed,
  },
};

// Status labels read as sentence fragments after "Chapter 427 …", but only the
// first letter may drop case: "Delivered to Jump" has to keep its capital J.
export function lowerFirst(label: string) {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function formatDate(
  date?: string,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!date) return "Not confirmed";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatReleaseDate(
  releaseAt: string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
) {
  return new Intl.DateTimeFormat("en", options).format(new Date(releaseAt));
}
