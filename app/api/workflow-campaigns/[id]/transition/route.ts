import { NextRequest, NextResponse } from "next/server";
import { applyTransition } from "@/lib/workflow/server";
import { isValidStage } from "@/lib/workflow/stages";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { to, notes, enforceGate } = body ?? {};

  if (!to || !isValidStage(to)) {
    return NextResponse.json({ error: "valid `to` stage required" }, { status: 400 });
  }

  const result = await applyTransition(id, to, { notes, enforceGate });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
  return NextResponse.json(result);
}
