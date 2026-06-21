import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STAGE_CONFIG, isValidStage } from "@/lib/workflow/stages";

// Cross-campaign event stream. Distinct from /inbox (notifications): /inbox is
// "things addressed to you," /activity is "what's been happening." We fan-out
// across four source tables (transitions, approvals, comments, brief decks)
// and merge by timestamp.
//
// Query params:
//   limit=N         — per-source row cap (default 50, max 200). Final merged
//                     list is also capped at limit.
//   types=a,b,c     — comma-separated subset of: transition | approval |
//                     comment | brief. Defaults to all.
//   sinceHours=N    — restrict to the last N hours (default 168 = 7d).

type ActivityKind = "transition" | "approval" | "comment" | "brief";

interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  at: string;
  campaignId: string;
  campaignName: string;
  actor?: string | null;
  stage?: string;
  stageLabel?: string;
  description: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);
  const sinceHours = Math.max(1, Math.min(Number(searchParams.get("sinceHours") ?? 168), 24 * 90));
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const types: ActivityKind[] = (() => {
    const t = searchParams.get("types");
    if (!t) return ["transition", "approval", "comment", "brief"];
    const allowed: ActivityKind[] = ["transition", "approval", "comment", "brief"];
    return t.split(",").map((s) => s.trim()).filter((s): s is ActivityKind => allowed.includes(s as ActivityKind));
  })();

  const stageLabel = (s: string | null | undefined): string =>
    s && isValidStage(s) ? STAGE_CONFIG[s].label : (s ?? "");

  const tasks: Array<Promise<ActivityEntry[]>> = [];

  if (types.includes("transition")) {
    tasks.push(
      prisma.workflowStageTransition.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { campaign: { select: { id: true, name: true } } },
      }).then((rows) => rows.map((r): ActivityEntry => ({
        id: `tr_${r.id}`,
        kind: "transition",
        at: r.createdAt.toISOString(),
        campaignId: r.campaignId,
        campaignName: r.campaign.name,
        actor: r.triggeredBy,
        stage: r.toStage,
        stageLabel: stageLabel(r.toStage),
        description: r.fromStage
          ? `${stageLabel(r.fromStage)} → ${stageLabel(r.toStage)}${r.notes ? ` — ${r.notes}` : ""}`
          : `Created at ${stageLabel(r.toStage)}`,
      }))),
    );
  }

  if (types.includes("approval")) {
    tasks.push(
      prisma.workflowApproval.findMany({
        where: { approvedAt: { gte: since } },
        orderBy: { approvedAt: "desc" },
        take: limit,
        include: { campaign: { select: { id: true, name: true } } },
      }).then((rows) => rows.map((r): ActivityEntry => ({
        id: `ap_${r.id}`,
        kind: "approval",
        at: r.approvedAt.toISOString(),
        campaignId: r.campaignId,
        campaignName: r.campaign.name,
        actor: r.approvedBy,
        stage: r.stage,
        stageLabel: stageLabel(r.stage),
        description: `${r.channel} approved ${stageLabel(r.stage)}${r.notes ? ` — ${r.notes}` : ""}`,
      }))),
    );
  }

  if (types.includes("comment")) {
    tasks.push(
      prisma.workflowComment.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { campaign: { select: { id: true, name: true } } },
      }).then((rows) => rows.map((r): ActivityEntry => ({
        id: `cm_${r.id}`,
        kind: "comment",
        at: r.createdAt.toISOString(),
        campaignId: r.campaignId,
        campaignName: r.campaign.name,
        actor: r.authorEmail,
        description: r.body.length > 200 ? `${r.body.slice(0, 200)}…` : r.body,
      }))),
    );
  }

  if (types.includes("brief")) {
    tasks.push(
      prisma.workflowBriefDeck.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { campaign: { select: { id: true, name: true } } },
      }).then((rows) => rows.map((r): ActivityEntry => ({
        id: `br_${r.id}`,
        kind: "brief",
        at: r.createdAt.toISOString(),
        campaignId: r.campaignId,
        campaignName: r.campaign.name,
        actor: r.generatedBy,
        description: `Brief v${r.version} generated (${r.generatedBy})`,
      }))),
    );
  }

  const merged = (await Promise.all(tasks)).flat();
  merged.sort((a, b) => b.at.localeCompare(a.at));
  return NextResponse.json(merged.slice(0, limit));
}
