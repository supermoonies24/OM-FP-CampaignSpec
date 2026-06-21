import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bootstrapStage, getActorId } from "@/lib/workflow/server";
import { STAGES } from "@/lib/workflow/stages";

// Duplicate a workflow campaign. The new campaign:
// - starts fresh at INTAKE with a new bootstrap transition
// - inherits the original's name (suffixed " (copy)"), client, intake form
// - does NOT copy: brief deck, channel assignments, stage history, timeline,
//   approvals, notifications, comments, AI runs, spec form link
//
// Useful for templating "this campaign worked, run another like it" rather
// than re-keying intake from scratch.
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const source = await prisma.workflowCampaign.findUnique({
    where: { id },
    include: { intake: true },
  });
  if (!source) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const actorId = getActorId();
  const newName = `${source.name} (copy)`;
  const initial = STAGES[0];

  const created = await prisma.$transaction(async (tx) => {
    const campaign = await tx.workflowCampaign.create({
      data: {
        name: newName,
        client: source.client,
        currentStage: initial,
        status: "active",
        figmaUrl: source.figmaUrl,
      },
    });

    if (source.intake) {
      await tx.workflowIntake.create({
        data: {
          campaignId: campaign.id,
          submittedBy: actorId,
          rawForm: source.intake.rawForm,
        },
      });
    }

    await bootstrapStage(tx, campaign.id, initial, {
      actorId,
      notes: `Duplicated from ${source.id}`,
    });

    return campaign;
  });

  return NextResponse.json(created);
}
