import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bootstrapStage, getActorId } from "@/lib/workflow/server";
import { STAGES } from "@/lib/workflow/stages";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  const baseInclude = {
    _count: { select: { stageHistory: true, approvals: true, comments: true } },
    // The single open TimelineItem (the one for the campaign's current
    // stage). Used by board/list to render a per-card risk dot.
    timeline: {
      where: { actualDate: null },
      orderBy: { targetDate: "asc" as const },
      take: 1,
    },
  };

  if (!q) {
    const campaigns = await prisma.workflowCampaign.findMany({
      orderBy: { updatedAt: "desc" },
      include: baseInclude,
    });
    return NextResponse.json(campaigns);
  }

  // Brief and intake fields are JSON-stringified, so LIKE over the raw text
  // searches keys + values together. Good enough for v1; Phase 5 may swap in
  // SQLite FTS5 or Postgres tsvector.
  const like = { contains: q };
  const matches = await prisma.workflowCampaign.findMany({
    where: {
      OR: [
        { name: like },
        { client: like },
        { tags: like },
        { briefDeck: { highLevelJourney: like } },
        { briefDeck: { sfmcJourney: like } },
        { briefDeck: { specFormDraft: like } },
        { intake: { rawForm: like } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: baseInclude,
  });
  return NextResponse.json(matches);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, client, specFormId, figmaUrl } = body ?? {};

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const initialStage = STAGES[0]; // INTAKE

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.workflowCampaign.create({
      data: {
        name,
        client: client ?? "Ford Pro",
        currentStage: initialStage,
        specFormId: specFormId ?? null,
        figmaUrl: figmaUrl ?? null,
      },
    });
    await bootstrapStage(tx, created.id, initialStage, {
      actorId: getActorId(),
      notes: "Campaign created",
    });
    return created;
  });

  return NextResponse.json(campaign, { status: 201 });
}
