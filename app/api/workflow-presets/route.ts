import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const presets = await prisma.workflowFilterPreset.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(presets);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string; query?: string; hideClosed?: boolean; view?: string;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  // Upsert so re-saving a preset overwrites cleanly.
  const preset = await prisma.workflowFilterPreset.upsert({
    where: { name },
    create: {
      name,
      query: body.query?.trim() || null,
      hideClosed: body.hideClosed ?? true,
      view: body.view === "list" ? "list" : "board",
    },
    update: {
      query: body.query?.trim() || null,
      hideClosed: body.hideClosed ?? true,
      view: body.view === "list" ? "list" : "board",
    },
  });
  return NextResponse.json(preset);
}
