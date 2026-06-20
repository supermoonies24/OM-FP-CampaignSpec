import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreRisk } from "@/lib/workflow/risk";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const items = await prisma.workflowTimelineItem.findMany({ where: { campaignId: id } });
  const today = new Date();

  const updates = await Promise.all(
    items.map((item) => {
      const outcome = scoreRisk(
        {
          stage: item.stage,
          targetDate: item.targetDate,
          actualDate: item.actualDate,
        },
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

  return NextResponse.json({ scored: updates.length });
}
