import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActorId } from "@/lib/workflow/server";
import { STAGES } from "@/lib/workflow/stages";

interface IntakeBody {
  name: string;
  client?: string;
  submittedBy: string;
  rawForm: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<IntakeBody>;
  const { name, client, submittedBy, rawForm } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!submittedBy || typeof submittedBy !== "string") {
    return NextResponse.json({ error: "submittedBy is required" }, { status: 400 });
  }
  if (!rawForm || typeof rawForm !== "object") {
    return NextResponse.json({ error: "rawForm object is required" }, { status: 400 });
  }

  const initialStage = STAGES[0];

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.workflowCampaign.create({
      data: {
        name,
        client: client ?? "Ford Pro",
        currentStage: initialStage,
      },
    });
    await tx.workflowIntake.create({
      data: {
        campaignId: created.id,
        submittedBy,
        rawForm: JSON.stringify(rawForm),
      },
    });
    await tx.workflowStageTransition.create({
      data: {
        campaignId: created.id,
        fromStage: null,
        toStage: initialStage,
        triggeredBy: submittedBy,
        notes: "Intake submitted",
      },
    });
    return created;
  });

  return NextResponse.json(campaign, { status: 201 });
}
