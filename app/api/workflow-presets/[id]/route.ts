import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.workflowFilterPreset.delete({ where: { id } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
