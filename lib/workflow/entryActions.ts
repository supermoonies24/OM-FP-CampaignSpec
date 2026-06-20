import type { Prisma } from "@prisma/client";
import { STAGE_CONFIG, type Stage } from "./stages";

// Two-step entry-action handling on every stage transition:
//
// 1. recordEntryActions writes one WorkflowNotification placeholder per
//    declared entry action. Notifications are unsent (sentAt=null);
//    Phase 3+ integrations pick them up and actually deliver. This means
//    the audit log is complete from day one.
//
// 2. runProceduralEntryActions performs side effects that can be carried
//    out today, in-process — currently just `ensureSpecForm`. Other
//    kinds become real when their integrations (Outlook, AI, Jira, Teams)
//    land in later phases.

type TxClient = Prisma.TransactionClient;

export async function recordEntryActions(
  tx: TxClient,
  campaignId: string,
  toStage: Stage,
) {
  const config = STAGE_CONFIG[toStage];
  if (config.entryActions.length === 0) return;

  const recipients = JSON.stringify(config.participants);

  await tx.workflowNotification.createMany({
    data: config.entryActions.map((action) => ({
      campaignId,
      kind: action.kind,
      channel: action.kind === "calendarInvite" ? "outlook"
        : action.kind === "createTeamsChannel" ? "teams"
        : "inApp",
      recipients,
      payload: JSON.stringify({
        stage: toStage,
        stageLabel: config.label,
        ownerChannel: config.ownerChannel,
        gate: config.gate,
        slaDays: config.slaDays,
        notes: action.notes,
      }),
    })),
  });

  await runProceduralEntryActions(tx, campaignId, toStage);
}

async function runProceduralEntryActions(tx: TxClient, campaignId: string, toStage: Stage) {
  const config = STAGE_CONFIG[toStage];
  for (const action of config.entryActions) {
    if (action.kind === "ensureSpecForm") {
      await ensureSpecForm(tx, campaignId);
    }
  }
}

async function ensureSpecForm(tx: TxClient, campaignId: string) {
  const campaign = await tx.workflowCampaign.findUnique({
    where: { id: campaignId },
    include: { briefDeck: true },
  });
  if (!campaign || campaign.specFormId) return;

  let seed: Record<string, unknown> = { campaignName: campaign.name };
  if (campaign.briefDeck) {
    try {
      const draft = JSON.parse(campaign.briefDeck.specFormDraft) as Record<string, unknown>;
      seed = { ...seed, ...draft };
    } catch {
      // ignore malformed draft, use just the name
    }
  }

  const specForm = await tx.campaign.create({ data: seed });
  await tx.workflowCampaign.update({
    where: { id: campaignId },
    data: { specFormId: specForm.id },
  });
}
