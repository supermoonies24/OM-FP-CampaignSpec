import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreRisk } from "@/lib/workflow/risk";

// Batch risk scorer: runs the deterministic scoreRisk() over every
// open TimelineItem in the system and persists. This is what Phase 4's
// cron will call (every 30 min per VISION.md §8.2); for now it's
// manually triggered from the workflow board's "Score risk" button.
export async function POST() {
  const items = await prisma.workflowTimelineItem.findMany({
    where: { actualDate: null },
  });
  const today = new Date();

  await Promise.all(
    items.map((item) => {
      const outcome = scoreRisk(
        { stage: item.stage, targetDate: item.targetDate, actualDate: item.actualDate },
        today,
      );
      return prisma.workflowTimelineItem.update({
        where: { id: item.id },
        data: {
          status: outcome.status,
          riskScore: outcome.riskScore,
          riskReason: outcome.riskReason,
        },
      });
    }),
  );

  return NextResponse.json({ scored: items.length });
}
