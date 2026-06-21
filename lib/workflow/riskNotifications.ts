import { prisma } from "@/lib/prisma";
import type { RiskOutcome } from "./risk";
import { STAGE_CONFIG, isValidStage } from "./stages";

// Edge-triggered notifications: we only fire when a TimelineItem's status
// crosses INTO atRisk or late. Repeated calls at the same severity don't
// re-fire — that's the difference between an alert and a poll. Callers pass
// the previous status (from before the scorer ran) so we can detect the edge.

const SEVERITY: Record<RiskOutcome["status"], number> = {
  complete: 0,
  onTrack: 0,
  atRisk: 1,
  late: 2,
};

export interface MaybeFireRiskAlertInput {
  campaignId: string;
  campaignName: string;
  stage: string;
  timelineItemId: string;
  previousStatus: string;
  outcome: RiskOutcome;
}

export async function maybeFireRiskAlert(
  input: MaybeFireRiskAlertInput,
): Promise<{ fired: boolean }> {
  const next = input.outcome.status;
  const prev = (input.previousStatus as RiskOutcome["status"]) ?? "onTrack";
  const prevSeverity = SEVERITY[prev] ?? 0;
  const nextSeverity = SEVERITY[next] ?? 0;
  if (nextSeverity <= prevSeverity) return { fired: false };

  const stageLabel = isValidStage(input.stage)
    ? STAGE_CONFIG[input.stage].label
    : input.stage;
  const ownerChannel = isValidStage(input.stage)
    ? STAGE_CONFIG[input.stage].ownerChannel
    : null;

  await prisma.workflowNotification.create({
    data: {
      campaignId: input.campaignId,
      kind: "atRiskAlert",
      channel: "inApp",
      recipients: JSON.stringify(ownerChannel ? [ownerChannel] : []),
      payload: JSON.stringify({
        campaignName: input.campaignName,
        stage: input.stage,
        stageLabel,
        timelineItemId: input.timelineItemId,
        severity: next, // "atRisk" | "late"
        riskScore: input.outcome.riskScore,
        riskReason: input.outcome.riskReason,
        previousStatus: prev,
      }),
      // In-app delivery is immediate — sentAt == createdAt. Outlook + Teams
      // notifications stay unsent until their respective Phase 3 integrations
      // pick them up.
      sentAt: new Date(),
    },
  });
  return { fired: true };
}
