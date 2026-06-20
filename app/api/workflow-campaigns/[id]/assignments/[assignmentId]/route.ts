import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { assignmentId } = await params;
  await prisma.workflowChannelAssignment.delete({ where: { id: assignmentId } });
  return NextResponse.json({ ok: true });
}
