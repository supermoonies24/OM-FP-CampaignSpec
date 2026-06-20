import type { Prisma } from "@prisma/client";
import { STAGE_CONFIG, type Stage } from "./stages";

// Materializes the entryActions declared in STAGE_CONFIG into
// WorkflowNotification rows when a stage is entered. The notifications
// are stored unsent (sentAt=null); Phase 3 (Outlook) and beyond pick them
// up and actually deliver. This means the audit log is complete from day
// one — every transition shows what *should* have been notified, even if
// the integration that does the sending isn't wired yet.

type TxClient = Prisma.TransactionClient;

export async function recordEntryActions(
  tx: TxClient,
  campaignId: string,
  toStage: Stage,
) {
  const config = STAGE_CONFIG[toStage];
  if (config.entryActions.length === 0) return;

  // Recipients = the channels expected to participate in the new stage.
  // Until per-user auth lands, "recipients" is just the list of channel
  // identifiers — Phase 3 will resolve channels → user emails.
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
      // sentAt deliberately left null — the integration that actually
      // delivers this notification stamps sentAt when it goes out.
    })),
  });
}
