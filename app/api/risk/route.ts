import { NextRequest, NextResponse } from "next/server";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { STAGE_CONFIG, isValidStage } from "@/lib/workflow/stages";

// Cross-campaign risk view. Returns every open TimelineItem whose status is
// atRisk or late, plus a daysOverdue computed field, plus the owning campaign
// summary. Sorted by severity (late before atRisk) then days overdue desc.
//
// Query params:
//   channel=STRATEGY|CREATIVE|...  — filter by owner channel of the stage
//   status=atRisk|late             — filter to just one severity
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const channelFilter = searchParams.get("channel");
  const statusFilter = searchParams.get("status");

  const items = await prisma.workflowTimelineItem.findMany({
    where: {
      actualDate: null,
      status: statusFilter && ["atRisk", "late"].includes(statusFilter)
        ? statusFilter
        : { in: ["atRisk", "late"] },
    },
    orderBy: [{ status: "desc" }, { targetDate: "asc" }],
    include: {
      campaign: {
        select: {
          id: true, name: true, client: true,
          currentStage: true, status: true,
        },
      },
    },
  });

  const today = new Date();
  const rows = items
    .map((t) => {
      const ownerChannel = isValidStage(t.stage) ? STAGE_CONFIG[t.stage].ownerChannel : "";
      const stageLabel = isValidStage(t.stage) ? STAGE_CONFIG[t.stage].label : t.stage;
      const daysOverdue = differenceInCalendarDays(today, t.targetDate);
      return {
        id: t.id,
        campaignId: t.campaignId,
        campaign: t.campaign,
        stage: t.stage,
        stageLabel,
        ownerChannel,
        status: t.status,
        riskScore: t.riskScore,
        riskReason: t.riskReason,
        targetDate: t.targetDate.toISOString(),
        enteredAt: t.enteredAt?.toISOString() ?? null,
        daysOverdue,
      };
    })
    .filter((r) => !channelFilter || r.ownerChannel === channelFilter);

  // Sort: late before atRisk, then highest daysOverdue first.
  rows.sort((a, b) => {
    const sev = (s: string) => (s === "late" ? 2 : s === "atRisk" ? 1 : 0);
    return sev(b.status) - sev(a.status) || b.daysOverdue - a.daysOverdue;
  });

  const lateCount = rows.filter((r) => r.status === "late").length;
  const atRiskCount = rows.filter((r) => r.status === "atRisk").length;
  const campaignsAffected = new Set(rows.map((r) => r.campaignId)).size;
  const byChannel: Record<string, { late: number; atRisk: number }> = {};
  for (const r of rows) {
    if (!r.ownerChannel) continue;
    if (!byChannel[r.ownerChannel]) byChannel[r.ownerChannel] = { late: 0, atRisk: 0 };
    if (r.status === "late") byChannel[r.ownerChannel].late++;
    else byChannel[r.ownerChannel].atRisk++;
  }

  return NextResponse.json({
    summary: { lateCount, atRiskCount, campaignsAffected, byChannel },
    rows,
  });
}
