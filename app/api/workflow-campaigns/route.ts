import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActorId } from "@/lib/workflow/server";
import { STAGES } from "@/lib/workflow/stages";

export async function GET() {
  const campaigns = await prisma.workflowCampaign.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { stageHistory: true, approvals: true, comments: true } },
    },
  });
  return NextResponse.json(campaigns);
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
    await tx.workflowStageTransition.create({
      data: {
        campaignId: created.id,
        fromStage: null,
        toStage: initialStage,
        triggeredBy: getActorId(),
        notes: "Campaign created",
      },
    });
    return created;
  });

  return NextResponse.json(campaign, { status: 201 });
}
