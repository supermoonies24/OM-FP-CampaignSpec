import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyTransition } from "@/lib/workflow/server";
import { getNextStage, isValidStage } from "@/lib/workflow/stages";

// Bulk advance: takes a list of campaign IDs and tries to advance each to the
// next stage in the canonical order. Skips campaigns where the signoff gate
// would block — we DO enforce the gate; bulk advance is for "ready" campaigns,
// not a back door past approvals. Returns per-id outcome so the UI can show
// which advanced vs which were blocked.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; notes?: string };
  const ids = Array.isArray(body.ids) ? body.ids.filter((s) => typeof s === "string") : [];
  const notes = typeof body.notes === "string" ? body.notes : undefined;

  if (ids.length === 0) {
    return NextResponse.json({ error: "Provide ids" }, { status: 400 });
  }

  const campaigns = await prisma.workflowCampaign.findMany({
    where: { id: { in: ids } },
    select: { id: true, currentStage: true },
  });

  const results: Array<{
    campaignId: string;
    ok: boolean;
    fromStage?: string;
    toStage?: string;
    reason?: string;
  }> = [];

  for (const c of campaigns) {
    if (!isValidStage(c.currentStage)) {
      results.push({ campaignId: c.id, ok: false, reason: `Unknown current stage: ${c.currentStage}` });
      continue;
    }
    const next = getNextStage(c.currentStage);
    if (!next) {
      results.push({ campaignId: c.id, ok: false, fromStage: c.currentStage, reason: "Already at final stage" });
      continue;
    }
    const plan = await applyTransition(c.id, next, { notes, enforceGate: true });
    if (plan.ok) {
      results.push({ campaignId: c.id, ok: true, fromStage: c.currentStage, toStage: next });
    } else {
      results.push({ campaignId: c.id, ok: false, fromStage: c.currentStage, toStage: next, reason: plan.reason });
    }
  }

  const advanced = results.filter((r) => r.ok).length;
  const blocked = results.length - advanced;
  return NextResponse.json({ advanced, blocked, results });
}
