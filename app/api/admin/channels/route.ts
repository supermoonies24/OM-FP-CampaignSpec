import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const assignments = await prisma.workflowChannelAssignment.findMany({
    include: { campaign: { select: { id: true, name: true, client: true, currentStage: true } } },
    orderBy: [{ channel: "asc" }, { userId: "asc" }],
  });
  return NextResponse.json(assignments);
}
