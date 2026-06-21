import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["active", "onHold", "cancelled", "shipped"]);

// Bulk apply a status change to N campaigns. Status is a Phase 1 concept
// independent of stage progression — pausing/cancelling/shipping a campaign
// doesn't touch its currentStage.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; status?: string };
  const ids = Array.isArray(body.ids) ? body.ids.filter((s) => typeof s === "string") : [];
  const status = typeof body.status === "string" ? body.status : "";

  if (ids.length === 0) return NextResponse.json({ error: "Provide ids" }, { status: 400 });
  if (!ALLOWED.has(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${Array.from(ALLOWED).join(", ")}` },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = { status };
  if (status === "shipped") data.deployedAt = new Date();

  const res = await prisma.workflowCampaign.updateMany({
    where: { id: { in: ids } },
    data,
  });
  return NextResponse.json({ updated: res.count, status });
}
