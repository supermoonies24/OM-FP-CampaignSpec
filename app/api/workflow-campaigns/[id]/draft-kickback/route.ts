import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { draftKickbackReason } from "@/lib/ai/kickbackDrafter";
import { STAGE_CONFIG, isValidStage } from "@/lib/workflow/stages";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const to = req.nextUrl.searchParams.get("to");
  if (!to || !isValidStage(to)) {
    return NextResponse.json({ error: "to=<stageId> is required" }, { status: 400 });
  }

  const campaign = await prisma.workflowCampaign.findUnique({
    where: { id },
    select: { id: true, currentStage: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!isValidStage(campaign.currentStage)) {
    return NextResponse.json({ error: "Campaign in unknown stage" }, { status: 400 });
  }

  const [comments, lastTx] = await Promise.all([
    prisma.workflowComment.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { authorEmail: true, body: true, createdAt: true },
    }),
    prisma.workflowStageTransition.findFirst({
      where: { campaignId: id },
      orderBy: { createdAt: "desc" },
      select: { fromStage: true, toStage: true, notes: true, createdAt: true },
    }),
  ]);

  const result = await draftKickbackReason({
    campaignId: id,
    fromStage: campaign.currentStage,
    fromStageLabel: STAGE_CONFIG[campaign.currentStage].label,
    toStage: to,
    toStageLabel: STAGE_CONFIG[to].label,
    recentComments: comments,
    lastTransition: lastTx,
  });

  return NextResponse.json(result);
}
