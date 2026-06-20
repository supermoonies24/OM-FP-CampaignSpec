import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildBriefStub } from "@/lib/workflow/briefStub";
import { getActorId } from "@/lib/workflow/server";

// Phase 1 stub. Phase 2 swaps the buildBriefStub() call for a Claude
// API generation. Either way, the persistence shape is the same so the
// UI and downstream pptx export are stable.
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.workflowCampaign.findUnique({
    where: { id },
    include: { intake: true, briefDeck: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const intakeRaw = campaign.intake
    ? (() => { try { return JSON.parse(campaign.intake!.rawForm) as Record<string, unknown>; } catch { return null; } })()
    : null;

  const payload = buildBriefStub({
    campaignName: campaign.name,
    client: campaign.client,
    intakeRaw,
  });

  const data = {
    highLevelJourney: JSON.stringify(payload.highLevelJourney),
    sfmcJourney: JSON.stringify(payload.sfmcJourney),
    timeline: JSON.stringify(payload.timeline),
    specFormDraft: JSON.stringify(payload.specFormDraft),
    generatedBy: getActorId(), // "system" — Phase 2 will record "ai"
  };

  const brief = campaign.briefDeck
    ? await prisma.workflowBriefDeck.update({
        where: { id: campaign.briefDeck.id },
        data: { ...data, version: { increment: 1 } },
      })
    : await prisma.workflowBriefDeck.create({
        data: { campaignId: id, ...data },
      });

  return NextResponse.json(brief);
}
