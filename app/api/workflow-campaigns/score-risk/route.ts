import { NextResponse } from "next/server";
import { differenceInCalendarDays, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { scoreRiskAi } from "@/lib/ai/riskScorer";
import { mapWithConcurrency } from "@/lib/concurrency";
import { maybeFireRiskAlert } from "@/lib/workflow/riskNotifications";

// Bounded by Anthropic per-org RPM. 5 is a safe ceiling for a 30-min cron
// over typical OM-internal campaign counts; tune up once we measure.
const SCORER_CONCURRENCY = 5;

// Batch risk scorer: runs scoreRiskAi() over every open TimelineItem in the
// system. Closed items are excluded by design (they live in the history).
// This is what Phase 4's cron will call (every 30 min per VISION.md §8.2);
// for now it's manually triggered from the workflow board.
//
// Per-campaign signal gathering matches /api/workflow-campaigns/[id]/score-risk.
// We batch the signal queries (one query per signal kind, grouped by campaign)
// so this scales sub-linearly with campaign count.
export async function POST() {
  const today = new Date();
  const commentWindowStart = subDays(today, 14);

  const items = await prisma.workflowTimelineItem.findMany({
    where: { actualDate: null },
    include: { campaign: { select: { id: true, name: true, createdAt: true } } },
  });

  const campaignIds = Array.from(new Set(items.map((i) => i.campaignId)));

  const [recentComments, lastComments, approvals, historical] = await Promise.all([
    prisma.workflowComment.findMany({
      where: { campaignId: { in: campaignIds }, createdAt: { gte: commentWindowStart } },
      select: { campaignId: true },
    }),
    prisma.workflowComment.groupBy({
      by: ["campaignId"],
      where: { campaignId: { in: campaignIds } },
      _max: { createdAt: true },
    }),
    prisma.workflowApproval.findMany({
      where: { campaignId: { in: campaignIds } },
      select: { campaignId: true, stage: true },
    }),
    prisma.workflowTimelineItem.findMany({
      where: { actualDate: { not: null } },
      select: {
        stage: true,
        enteredAt: true,
        actualDate: true,
        campaign: { select: { id: true, createdAt: true } },
      },
    }),
  ]);

  const recentCommentCount = recentComments.reduce<Record<string, number>>((acc, c) => {
    acc[c.campaignId] = (acc[c.campaignId] ?? 0) + 1;
    return acc;
  }, {});
  const lastCommentAt = new Map<string, Date>(
    lastComments
      .filter((l) => l._max.createdAt)
      .map((l) => [l.campaignId, l._max.createdAt as Date]),
  );
  const approvalsByCampaignStage = approvals.reduce<Record<string, number>>((acc, a) => {
    acc[`${a.campaignId}::${a.stage}`] = (acc[`${a.campaignId}::${a.stage}`] ?? 0) + 1;
    return acc;
  }, {});

  // Historical avg STAGE DURATION per stage. enteredAt → actualDate when both
  // are present; falls back to campaign.createdAt → actualDate for legacy rows.
  // We exclude the current campaign from the average by tagging contributors.
  const historicalByStage = new Map<
    string,
    { campaigns: Set<string>; total: number; n: number }
  >();
  for (const h of historical) {
    if (!h.actualDate) continue;
    const anchor = h.enteredAt ?? h.campaign.createdAt;
    const days = differenceInCalendarDays(h.actualDate, anchor);
    if (days < 0) continue;
    if (!historicalByStage.has(h.stage)) {
      historicalByStage.set(h.stage, { campaigns: new Set(), total: 0, n: 0 });
    }
    const bucket = historicalByStage.get(h.stage)!;
    bucket.campaigns.add(h.campaign.id);
    bucket.total += days;
    bucket.n++;
  }
  const avgFor = (stage: string, excludeCampaignId: string): number | null => {
    const bucket = historicalByStage.get(stage);
    if (!bucket || bucket.n === 0) return null;
    if (bucket.campaigns.has(excludeCampaignId) && bucket.n === 1) return null;
    return bucket.total / bucket.n;
  };

  let aiScored = 0;
  let alertsFired = 0;
  await mapWithConcurrency(items, SCORER_CONCURRENCY, async (item) => {
    const outcome = await scoreRiskAi(
      {
        campaignId: item.campaignId,
        campaignName: item.campaign.name,
        stage: item.stage,
        targetDate: item.targetDate,
        actualDate: item.actualDate,
        recentCommentCount: recentCommentCount[item.campaignId] ?? 0,
        daysSinceLastComment: lastCommentAt.has(item.campaignId)
          ? differenceInCalendarDays(today, lastCommentAt.get(item.campaignId)!)
          : null,
        approvalsForStage:
          approvalsByCampaignStage[`${item.campaignId}::${item.stage}`] ?? 0,
        historicalAvgDays: avgFor(item.stage, item.campaignId),
      },
      { scoredAt: today },
    );
    aiScored++;

    const previousStatus = item.status;
    await prisma.workflowTimelineItem.update({
      where: { id: item.id },
      data: {
        status: outcome.status,
        riskScore: outcome.riskScore,
        riskReason: outcome.riskReason,
      },
    });

    const alert = await maybeFireRiskAlert({
      campaignId: item.campaignId,
      campaignName: item.campaign.name,
      stage: item.stage,
      timelineItemId: item.id,
      previousStatus,
      outcome,
    });
    if (alert.fired) alertsFired++;
  });

  return NextResponse.json({ scored: items.length, aiScored, alertsFired });
}
