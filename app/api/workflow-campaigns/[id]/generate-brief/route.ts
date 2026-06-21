import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBrief } from "@/lib/ai/briefGenerator";
import { renderBriefPptx } from "@/lib/ai/briefPptx";
import { syncBriefTimeline } from "@/lib/workflow/timeline";
import { getActorId } from "@/lib/workflow/server";
import type { BriefDeckPayload } from "@/lib/workflow/briefStub";

// Phase 2a: brief deck generation goes through the Claude-powered
// generateBrief(). It falls back to the deterministic stub when
// ANTHROPIC_API_KEY is unset or the model call fails, so dev/CI keep working.
//
// Optional body { instructions?: string } refines an existing brief — the
// model receives the prior payload + the new instruction and iterates rather
// than starting from scratch. Empty body = fresh generation.
//
// After persistence: (1) sync WorkflowTimelineItem.targetDate from the brief's
// suggested cadence so the rest of the workflow inherits the planned dates,
// (2) render a navy-branded pptx to public/briefs/ for download. Failures in
// (1) or (2) are non-fatal — the brief still saves.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { instructions?: string };
  const instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";

  const campaign = await prisma.workflowCampaign.findUnique({
    where: { id },
    include: { intake: true, briefDeck: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const intakeRaw = campaign.intake
    ? (() => { try { return JSON.parse(campaign.intake!.rawForm) as Record<string, unknown>; } catch { return null; } })()
    : null;

  // If refining, hydrate the prior brief from its serialized fields.
  let previousBrief: BriefDeckPayload | null = null;
  if (instructions && campaign.briefDeck) {
    try {
      previousBrief = {
        highLevelJourney: JSON.parse(campaign.briefDeck.highLevelJourney),
        sfmcJourney: JSON.parse(campaign.briefDeck.sfmcJourney),
        timeline: JSON.parse(campaign.briefDeck.timeline),
        specFormDraft: JSON.parse(campaign.briefDeck.specFormDraft),
      };
    } catch {
      previousBrief = null;
    }
  }

  const { payload, source } = await generateBrief({
    campaignId: id,
    campaignName: campaign.name,
    client: campaign.client,
    intakeRaw,
    instructions: instructions || null,
    previousBrief,
  });

  const data = {
    highLevelJourney: JSON.stringify(payload.highLevelJourney),
    sfmcJourney: JSON.stringify(payload.sfmcJourney),
    timeline: JSON.stringify(payload.timeline),
    specFormDraft: JSON.stringify(payload.specFormDraft),
    generatedBy: source === "ai" ? "ai" : getActorId(),
  };

  let brief = campaign.briefDeck
    ? await prisma.workflowBriefDeck.update({
        where: { id: campaign.briefDeck.id },
        data: { ...data, version: { increment: 1 } },
      })
    : await prisma.workflowBriefDeck.create({
        data: { campaignId: id, ...data },
      });

  // Anchor for timeline math — intake creation time is the campaign's kickoff.
  const kickoff = campaign.intake?.createdAt ?? campaign.createdAt;
  try {
    await syncBriefTimeline({ campaignId: id, payload, kickoff });
  } catch (err) {
    console.error("[generate-brief] timeline sync failed:", err);
  }

  try {
    const { publicUrl } = await renderBriefPptx({
      campaignId: id,
      campaignName: campaign.name,
      client: campaign.client,
      version: brief.version,
      payload,
    });
    brief = await prisma.workflowBriefDeck.update({
      where: { id: brief.id },
      data: { pptxUrl: publicUrl },
    });
  } catch (err) {
    console.error("[generate-brief] pptx render failed:", err);
  }

  return NextResponse.json(brief);
}
