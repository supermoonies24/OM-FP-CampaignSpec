import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.workflowCampaign.findUnique({
    where: { id },
    include: {
      intake: true,
      briefDeck: true,
      assignments: true,
      stageHistory: { orderBy: { createdAt: "asc" } },
      timeline: { orderBy: { targetDate: "asc" } },
      approvals: { orderBy: { approvedAt: "asc" } },
      notifications: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  // Strip relations / readonly fields. currentStage must be changed via the
  // transition endpoint so the state machine enforces gates.
  const {
    id: _id, createdAt, updatedAt, currentStage,
    intake, briefDeck, assignments, stageHistory, timeline, approvals, notifications, comments, aiRuns,
    tags,
    ...data
  } = body;
  // tags arrives as string[]; persist as JSON since SQLite has no array type.
  if (Array.isArray(tags)) {
    const cleaned = tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 32);
    (data as Record<string, unknown>).tags = JSON.stringify(Array.from(new Set(cleaned)));
  } else if (tags === null) {
    (data as Record<string, unknown>).tags = null;
  }
  const campaign = await prisma.workflowCampaign.update({ where: { id }, data });
  return NextResponse.json(campaign);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.workflowCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
