import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns prior brief versions for a campaign, newest first. The CURRENT
// brief lives on WorkflowBriefDeck — this list only contains the snapshots
// taken before each regenerate/refine.
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const versions = await prisma.workflowBriefVersion.findMany({
    where: { campaignId: id },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      generatedBy: true,
      instructions: true,
      createdAt: true,
    },
  });
  return NextResponse.json(versions);
}