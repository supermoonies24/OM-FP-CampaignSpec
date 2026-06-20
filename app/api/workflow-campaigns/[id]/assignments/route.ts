import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CHANNELS } from "@/lib/workflow/channels";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assignments = await prisma.workflowChannelAssignment.findMany({
    where: { campaignId: id },
    orderBy: [{ channel: "asc" }, { role: "asc" }],
  });
  return NextResponse.json(assignments);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { channel, userId, role } = body ?? {};

  if (!channel || !(CHANNELS as readonly string[]).includes(channel)) {
    return NextResponse.json({ error: "valid `channel` required" }, { status: 400 });
  }
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const finalRole = typeof role === "string" && role ? role : "contributor";

  try {
    const created = await prisma.workflowChannelAssignment.create({
      data: { campaignId: id, channel, userId, role: finalRole },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    // Likely unique-constraint violation (same campaign/channel/user/role twice).
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create assignment" },
      { status: 409 },
    );
  }
}
