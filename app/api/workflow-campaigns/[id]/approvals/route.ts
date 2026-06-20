import { NextRequest, NextResponse } from "next/server";
import { recordApproval } from "@/lib/workflow/server";
import { CHANNELS, type Channel } from "@/lib/workflow/channels";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { channel, notes } = body ?? {};

  if (!channel || !(CHANNELS as readonly string[]).includes(channel)) {
    return NextResponse.json({ error: "valid `channel` required" }, { status: 400 });
  }

  try {
    const approval = await recordApproval(id, channel as Channel, { notes });
    return NextResponse.json(approval, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to record approval" },
      { status: 400 },
    );
  }
}
