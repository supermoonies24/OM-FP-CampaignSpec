import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Detail view of a single AiRun. Includes parsed inputJson/outputJson so the
// UI can render structured input + the model's exact response (or error).
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await prisma.aiRun.findUnique({
    where: { id },
    include: { campaign: { select: { id: true, name: true, client: true, currentStage: true } } },
  });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const safeParse = (s: string): unknown => {
    try { return JSON.parse(s); } catch { return null; }
  };

  return NextResponse.json({
    id: run.id,
    campaignId: run.campaignId,
    campaign: run.campaign,
    feature: run.feature,
    model: run.model,
    status: run.status,
    tokensIn: run.tokensIn,
    tokensOut: run.tokensOut,
    durationMs: run.durationMs,
    createdAt: run.createdAt,
    input: safeParse(run.inputJson),
    output: safeParse(run.outputJson),
  });
}
