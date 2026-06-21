import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mark a single notification as read. Idempotent — re-marking a read row is a
// no-op (readAt stays at its earlier value).
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = await prisma.workflowNotification.updateMany({
    where: { id, channel: "inApp", readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ updated: updated.count });
}
