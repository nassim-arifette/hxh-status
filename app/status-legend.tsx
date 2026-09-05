"use client";

import type { Messages } from "@/lib/i18n";
import type { ChapterStatus } from "./data/status";
import { getStatusMeta, type StatusMeta } from "./status-presentation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type StatusMap = Record<ChapterStatus, StatusMeta>;

const statusOrder: ChapterStatus[] = [
  "published",
  "scheduled",
  "delivered",
  "background",
  "inking",
  "unknown",
];

export function Legend({
  messages,
  statusMeta,
}: {
  messages: Messages;
  statusMeta?: StatusMap;
}) {
  const metaMap = statusMeta ?? getStatusMeta(messages.statuses);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="legend" aria-label={messages.production.legendAria}>
        {statusOrder.map((status) => {
          const meta = metaMap[status];
          const StatusIcon = meta.icon;

          return (
            <Tooltip key={status}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="legend-item legend-item-interactive"
                  data-status={status}
                  aria-label={`${meta.label}: ${meta.description}`}
                >
                  <span className="legend-icon" aria-hidden="true">
                    <StatusIcon size={15} strokeWidth={2.2} />
                  </span>
                  <span className="legend-label">{meta.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                sideOffset={8}
                className="status-tooltip-content"
              >
                <div className="status-tooltip-header">
                  <span
                    className="status-tooltip-icon-wrap"
                    data-status={status}
                    aria-hidden="true"
                  >
                    <StatusIcon size={13} strokeWidth={2.4} />
                  </span>
                  <span className="status-tooltip-title">{meta.label}</span>
                </div>
                <p className="status-tooltip-desc">{meta.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
