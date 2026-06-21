import { NextRequest, NextResponse } from "next/server";
import { findSimilarCampaigns } from "@/lib/ai/similarCampaigns";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await findSimilarCampaigns({ campaignId: id });
  return NextResponse.json(result);
}
