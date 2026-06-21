import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { differenceInCalendarDays } from "date-fns";
import { STAGE_CONFIG, isValidStage } from "@/lib/workflow/stages";

// Exports the campaign encyclopedia as CSV. One row per WorkflowCampaign with
// rolled-up metrics: stage, status, owner channel, brief metadata, risk
// summary, timeline summary, AI run summary.
//
// Query params:
//   include=timeline      — appends additional rows: one per TimelineItem
//                           after the campaign row (long format for spreadsheet
//                           pivots). Default: campaigns only.
export async function GET(req: NextRequest) {
  const includeTimeline = req.nextUrl.searchParams.get("include") === "timeline";

  const campaigns = await prisma.workflowCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      briefDeck: { select: { generatedBy: true, version: true, createdAt: true } },
      timeline: { orderBy: { targetDate: "asc" } },
      _count: { select: { aiRuns: true, notifications: true, comments: true } },
    },
  });

  const headers: string[] = [
    "type",
    "campaignId",
    "name",
    "client",
    "currentStage",
    "stageLabel",
    "ownerChannel",
    "status",
    "createdAt",
    "updatedAt",
    "deployedAt",
    "briefVersion",
    "briefGeneratedBy",
    "briefAt",
    "aiRunCount",
    "notificationCount",
    "commentCount",
    "openItems",
    "atRiskItems",
    "lateItems",
    "maxRiskScore",
    // Timeline-row-only fields (blank on campaign rows)
    "stage",
    "enteredAt",
    "targetDate",
    "actualDate",
    "itemStatus",
    "riskScore",
    "riskReason",
  ];

  const rows: unknown[][] = [];

  for (const c of campaigns) {
    const openItems = c.timeline.filter((t) => !t.actualDate);
    const atRiskItems = openItems.filter((t) => t.status === "atRisk").length;
    const lateItems = openItems.filter((t) => t.status === "late").length;
    const maxRisk = openItems.reduce((m, t) => Math.max(m, t.riskScore ?? 0), 0);
    const stageLabel = isValidStage(c.currentStage) ? STAGE_CONFIG[c.currentStage].label : c.currentStage;
    const ownerChannel = isValidStage(c.currentStage) ? STAGE_CONFIG[c.currentStage].ownerChannel : "";

    rows.push([
      "campaign",
      c.id,
      c.name,
      c.client,
      c.currentStage,
      stageLabel,
      ownerChannel,
      c.status,
      c.createdAt.toISOString(),
      c.updatedAt.toISOString(),
      c.deployedAt?.toISOString() ?? "",
      c.briefDeck?.version ?? "",
      c.briefDeck?.generatedBy ?? "",
      c.briefDeck?.createdAt.toISOString() ?? "",
      c._count.aiRuns,
      c._count.notifications,
      c._count.comments,
      openItems.length,
      atRiskItems,
      lateItems,
      maxRisk.toFixed(2),
      // Trailing timeline-only columns blank
      "", "", "", "", "", "", "",
    ]);

    if (includeTimeline) {
      for (const t of c.timeline) {
        rows.push([
          "timeline",
          c.id,
          c.name,
          c.client,
          c.currentStage,
          stageLabel,
          ownerChannel,
          c.status,
          "", "", "", "", "", "", "", "", "", "", "", "", "",
          t.stage,
          t.enteredAt?.toISOString() ?? "",
          t.targetDate.toISOString(),
          t.actualDate?.toISOString() ?? "",
          t.status,
          t.riskScore?.toFixed(2) ?? "",
          t.riskReason ?? "",
        ]);
      }
    }

    void differenceInCalendarDays; // reserved for future days-in-stage column
  }

  const body = toCsv(headers, rows);
  const filename = `campaigns-${new Date().toISOString().slice(0, 10)}${includeTimeline ? "-with-timeline" : ""}.csv`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
