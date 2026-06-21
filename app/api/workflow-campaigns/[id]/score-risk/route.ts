import { NextRequest, NextResponse } from "next/server";
import { differenceInCalendarDays, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { scoreRisk } from "@/lib/workflow/risk";
import { scoreRiskAi } from "@/lib/ai/riskScorer";
import { mapWithConcurrency } from "@/lib/concurrency";
import { maybeFireRiskAlert } from "@/lib/workflow/riskNotifications";

const SCORER_CONCURRENCY = 5;

// Phase 2b: AI risk scorer wraps the deterministic baseline. Closed timeline
// items still get the cheap deterministic path. Open items go through Claude
// with stage, target date, comment activity, approval count, and the
// historical average duration for the stage across prior campaigns.
//
// All sub-scorings either succeed or silently fall back to the deterministic
// scorer — the endpoint always returns 200 with a count of items scored.
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.workflowCampaign.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const items = await prisma.workflowTimelineItem.findMany({ where: { campaignId: id } });
  const today = new Date();
  const commentWindowStart = subDays(today, 14);

  // Comment activity for the campaign. Cheaper than per-item queries.
  const recentComments = await prisma.workflowComment.findMany({
    where: { campaignId: id, createdAt: { gte: commentWindowStart } },
    orderBy: { createdAt: "desc" },
  });
  const lastComment = await prisma.workflowComment.findFirst({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const daysSinceLastComment = lastComment
    ? differenceInCalendarDays(today, lastComment.createdAt)
    : null;

  // Approvals per stage so the scorer knows review-round count.
  const approvals = await prisma.workflowApproval.findMany({
    where: { campaignId: id },
    select: { stage: true },
  });
  const approvalsByStage = approvals.reduce<Record<string, number>>((acc, a) => {
    acc[a.stage] = (acc[a.stage] ?? 0) + 1;
    return acc;
  }, {});

  // Historical avg STAGE DURATION across CLOSED items on OTHER campaigns.
  // Prefer enteredAt → actualDate; fall back to campaign.createdAt → actualDate
  // for legacy rows that pre-date the enteredAt column.
  const historical = await prisma.workflowTimelineItem.findMany({
    where: {
      campaignId: { not: id },
      actualDate: { not: null },
    },
    select: {
      stage: true,
      enteredAt: true,
      actualDate: true,
      campaign: { select: { createdAt: true } },
    },
  });
  const historicalByStage = new Map<string, number[]>();
  for (const h of historical) {
    if (!h.actualDate) continue;
    const anchor = h.enteredAt ?? h.campaign.createdAt;
    const days = differenceInCalendarDays(h.actualDate, anchor);
    if (days < 0) continue;
    if (!historicalByStage.has(h.stage)) historicalByStage.set(h.stage, []);
    historicalByStage.get(h.stage)!.push(days);
  }
  const avgFor = (stage: string): number | null => {
    const arr = historicalByStage.get(stage);
    if (!arr || arr.length === 0) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  let aiScored = 0;
  let alertsFired = 0;
  const updates = await mapWithConcurrency(items, SCORER_CONCURRENCY, async (item) => {
    let outcome;
    if (item.actualDate) {
      outcome = scoreRisk(
        { stage: item.stage, targetDate: item.targetDate, actualDate: item.actualDate },
        today,
      );
    } else {
      outcome = await scoreRiskAi(
        {
          campaignId: id,
          campaignName: campaign.name,
          stage: item.stage,
          targetDate: item.targetDate,
          actualDate: item.actualDate,
          recentCommentCount: recentComments.length,
          daysSinceLastComment,
          approvalsForStage: approvalsByStage[item.stage] ?? 0,
          historicalAvgDays: avgFor(item.stage),
        },
        { scoredAt: today },
      );
      aiScored++;
    }

    const previousStatus = item.status;
    const updated = await prisma.workflowTimelineItem.update({
      where: { id: item.id },
      data: {
        status: outcome.status,
        riskScore: outcome.riskScore,
        riskReason: outcome.riskReason,
      },
    });

    const alert = await maybeFireRiskAlert({
      campaignId: id,
      campaignName: campaign.name,
      stage: item.stage,
      timelineItemId: item.id,
      previousStatus,
      outcome,
    });
    if (alert.fired) alertsFired++;

    return updated;
  });

  return NextResponse.json({ scored: updates.length, aiScored, alertsFired });
}
