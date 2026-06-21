import { prisma } from "@/lib/prisma";
import type { BriefDeckPayload } from "@/lib/workflow/briefStub";
import { STAGES, isValidStage, type Stage } from "./stages";

// Sync TimelineItem targetDate values from a generated brief deck. Closed
// items (those with an actualDate) are left untouched — they represent real
// historical events. Open items get their targetDate updated to the brief's
// suggested cadence; if no item exists yet for a future stage, one is created
// so downstream views (timeline page, risk scorer) can plan against it.
//
// `rollTimeline()` in server.ts uses find-or-create semantics so this
// pre-creation doesn't produce duplicates on stage transitions.

export interface SyncBriefTimelineInput {
  campaignId: string;
  payload: BriefDeckPayload;
  /** Reference point for `targetOffsetDays` (typically intake.createdAt). */
  kickoff: Date;
}

export interface SyncBriefTimelineResult {
  updated: number;
  created: number;
  skipped: number;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + Math.round(days));
  return out;
}

export async function syncBriefTimeline(
  input: SyncBriefTimelineInput,
): Promise<SyncBriefTimelineResult> {
  const result: SyncBriefTimelineResult = { updated: 0, created: 0, skipped: 0 };

  // Index brief entries by stage; only consider valid stages.
  const byStage = new Map<Stage, number>();
  for (const entry of input.payload.timeline) {
    if (isValidStage(entry.stage)) {
      byStage.set(entry.stage, entry.targetOffsetDays);
    }
  }

  // Process in canonical stage order so created rows feel chronological.
  for (const stage of STAGES) {
    const offset = byStage.get(stage);
    if (offset === undefined) {
      result.skipped++;
      continue;
    }
    const target = addDays(input.kickoff, offset);

    const open = await prisma.workflowTimelineItem.findFirst({
      where: { campaignId: input.campaignId, stage, actualDate: null },
      orderBy: { targetDate: "asc" },
    });

    if (open) {
      // Only update if the date actually changes (avoids no-op writes).
      if (open.targetDate.getTime() !== target.getTime()) {
        await prisma.workflowTimelineItem.update({
          where: { id: open.id },
          data: { targetDate: target },
        });
        result.updated++;
      } else {
        result.skipped++;
      }
      continue;
    }

    // No open item — has it been closed already (e.g., we've moved past this
    // stage)? If a closed item exists for this stage, leave history alone.
    const closed = await prisma.workflowTimelineItem.findFirst({
      where: { campaignId: input.campaignId, stage, NOT: { actualDate: null } },
    });
    if (closed) {
      result.skipped++;
      continue;
    }

    // Future stage with no item yet — pre-create one.
    await prisma.workflowTimelineItem.create({
      data: {
        campaignId: input.campaignId,
        stage,
        targetDate: target,
        status: "onTrack",
      },
    });
    result.created++;
  }

  return result;
}
