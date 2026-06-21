import { NextRequest, NextResponse } from "next/server";
import { findIntakeClarifications } from "@/lib/ai/intakeClarifier";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await findIntakeClarifications(id);
  return NextResponse.json(result);
}
