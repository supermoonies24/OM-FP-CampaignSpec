import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { planTransition, type TransitionResult } from "./transitions";
import { STAGE_CONFIG, type Stage, isValidStage } from "./stages";
import { recordEntryActions } from "./entryActions";

// Server-side workflow helpers. The state machine itself (lib/workflow/transitions.ts)
// is pure; this module persists transitions, approvals, and the timeline items
// derived from each stage's SLA.

/**
 * Placeholder user identity. v1 has only passcode auth — there is no per-user
 * session. Every action is attributed to "system" until real auth lands.
 */
export function getActorId(): string {
  return "system";
}

/**
 * Days-from-now helper for TimelineItem.targetDate. Calendar days, not
 * business days — close enough for v1.
 */
function targetDateFor(slaDays: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + slaDays);
  return d;
}

type TxClient = Prisma.TransactionClient;

/**
 * Writes the bookkeeping for entering a stage: closes any open TimelineItem
 * for the previous stage (marking it complete or late), then opens a new
 * TimelineItem for the next stage with a target derived from its SLA.
 *
 * Caller is responsible for writing the StageTransition row and updating
 * Campaign.currentStage — this only touches TimelineItem rows.
 */
async function rollTimeline(
  tx: TxClient,
  campaignId: string,
  fromStage: Stage | null,
  toStage: Stage,
  at: Date = new Date(),
) {
  if (fromStage) {
    const open = await tx.workflowTimelineItem.findFirst({
      where: { campaignId, stage: fromStage, actualDate: null },
      orderBy: { targetDate: "asc" },
    });
    if (open) {
      await tx.workflowTimelineItem.update({
        where: { id: open.id },
        data: {
          actualDate: at,
          status: at <= open.targetDate ? "complete" : "late",
        },
      });
    }
  }

  await tx.workflowTimelineItem.create({
    data: {
      campaignId,
      stage: toStage,
      targetDate: targetDateFor(STAGE_CONFIG[toStage].slaDays, at),
      status: "onTrack",
    },
  });
}

/**
 * Apply a stage transition: enforces the gate via planTransition(), then
 * writes a StageTransition row, updates Campaign.currentStage, and rolls
 * the timeline (closes the prior item, opens the next). Returns the
 * planTransition result so callers can react to entryActions.
 */
export async function applyTransition(
  campaignId: string,
  to: Stage,
  opts: { actorId?: string; notes?: string; enforceGate?: boolean } = {},
): Promise<TransitionResult> {
  const campaign = await prisma.workflowCampaign.findUnique({
    where: { id: campaignId },
    include: { approvals: true },
  });
  if (!campaign) return { ok: false, reason: "Campaign not found" };
  if (!isValidStage(campaign.currentStage)) {
    return { ok: false, reason: `Campaign is in unknown stage: ${campaign.currentStage}` };
  }

  const from = campaign.currentStage as Stage;
  const approvalsForFromStage = campaign.approvals.filter((a) => a.stage === from);

  const plan = planTransition({
    from,
    to,
    approvalsForFromStage,
    enforceGate: opts.enforceGate ?? true,
  });
  if (!plan.ok) return plan;

  await prisma.$transaction(async (tx) => {
    await tx.workflowStageTransition.create({
      data: {
        campaignId,
        fromStage: from,
        toStage: to,
        triggeredBy: opts.actorId ?? getActorId(),
        notes: opts.notes,
      },
    });
    await tx.workflowCampaign.update({
      where: { id: campaignId },
      data: { currentStage: to },
    });
    await rollTimeline(tx, campaignId, from, to);
    await recordEntryActions(tx, campaignId, to);
  });

  return plan;
}

/**
 * Bootstrap a campaign on creation: writes the initial StageTransition
 * (from null → INTAKE or whatever the seed stage is) and opens the first
 * TimelineItem. Designed to run inside an existing prisma.$transaction.
 */
export async function bootstrapStage(
  tx: TxClient,
  campaignId: string,
  toStage: Stage,
  opts: { actorId: string; notes?: string },
) {
  await tx.workflowStageTransition.create({
    data: {
      campaignId,
      fromStage: null,
      toStage,
      triggeredBy: opts.actorId,
      notes: opts.notes,
    },
  });
  await rollTimeline(tx, campaignId, null, toStage);
  await recordEntryActions(tx, campaignId, toStage);
}

/**
 * Record a signoff approval for the current stage.
 */
export async function recordApproval(
  campaignId: string,
  channel: string,
  opts: { actorId?: string; notes?: string } = {},
) {
  const campaign = await prisma.workflowCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");

  return prisma.workflowApproval.create({
    data: {
      campaignId,
      stage: campaign.currentStage,
      channel,
      approvedBy: opts.actorId ?? getActorId(),
      notes: opts.notes,
    },
  });
}

/**
 * The owner channel for a stage, per STAGE_CONFIG. Convenience for UI gating.
 */
export function ownerChannelForStage(stage: string): string | null {
  if (!isValidStage(stage)) return null;
  return STAGE_CONFIG[stage].ownerChannel;
}
