import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const briefs = await prisma.workflowBriefDeck.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { id: true, name: true, client: true, currentStage: true, status: true } },
    },
  });
  return NextResponse.json(briefs);
}
