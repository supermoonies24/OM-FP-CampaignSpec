import { prisma } from "@/lib/prisma";
import { planTransition, type TransitionResult } from "./transitions";
import { STAGE_CONFIG, type Stage, isValidStage } from "./stages";

// Server-side workflow helpers. The state machine itself (lib/workflow/transitions.ts)
// is pure; this module persists transitions and approvals.

/**
 * Placeholder user identity. v1 has only passcode auth — there is no per-user
 * session. Every action is attributed to "system" until real auth lands.
 */
export function getActorId(): string {
  return "system";
}

/**
 * Apply a stage transition: enforces the gate via planTransition(), then
 * writes a StageTransition row and updates Campaign.currentStage. Returns
 * the planTransition result so callers can react to entryActions.
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

  await prisma.$transaction([
    prisma.workflowStageTransition.create({
      data: {
        campaignId,
        fromStage: from,
        toStage: to,
        triggeredBy: opts.actorId ?? getActorId(),
        notes: opts.notes,
      },
    }),
    prisma.workflowCampaign.update({
      where: { id: campaignId },
      data: { currentStage: to },
    }),
  ]);

  return plan;
}

/**
 * Record a signoff approval for the current stage. Idempotent per (campaign, stage, channel, user).
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
