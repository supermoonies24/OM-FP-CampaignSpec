import type { Prisma } from "@prisma/client";
import { STAGE_CONFIG, type Stage } from "./stages";

// Two-step entry-action handling on every stage transition:
//
// 1. recordEntryActions writes one WorkflowNotification row per declared
//    entry action. In-app notifications are delivered immediately
//    (sentAt = createdAt) and surface in /inbox; Outlook + Teams notifications
//    stay unsent (sentAt=null) until their Phase 3 integrations claim them.
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

  const now = new Date();
  const baseRows = config.entryActions.map((action) => {
    const channel =
      action.kind === "calendarInvite" ? "outlook"
      : action.kind === "createTeamsChannel" ? "teams"
      : "inApp";
    return {
      campaignId,
      kind: action.kind,
      channel,
      recipients,
      payload: JSON.stringify({
        stage: toStage,
        stageLabel: config.label,
        ownerChannel: config.ownerChannel,
        gate: config.gate,
        slaDays: config.slaDays,
        notes: action.notes,
      }),
      sentAt: channel === "inApp" ? now : null,
    };
  });

  // Signoff stages get an additional, explicit approvalRequested in-app
  // notification addressed to just the owner channel. The generic 'notify'
  // entries above are too vague for the owner to spot what they need to do.
  const signoffRows = config.gate === "signoff"
    ? [{
        campaignId,
        kind: "approvalRequested",
        channel: "inApp",
        recipients: JSON.stringify([config.ownerChannel]),
        payload: JSON.stringify({
          stage: toStage,
          stageLabel: config.label,
          ownerChannel: config.ownerChannel,
          slaDays: config.slaDays,
        }),
        sentAt: now,
      }]
    : [];

  await tx.workflowNotification.createMany({ data: [...baseRows, ...signoffRows] });

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
