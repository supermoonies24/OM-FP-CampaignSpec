import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { authorEmail, body: text, source } = body ?? {};

  if (!authorEmail || typeof authorEmail !== "string") {
    return NextResponse.json({ error: "authorEmail required" }, { status: 400 });
  }
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const comment = await prisma.workflowComment.create({
    data: {
      campaignId: id,
      source: typeof source === "string" ? source : "inApp",
      authorEmail,
      body: text.trim(),
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
