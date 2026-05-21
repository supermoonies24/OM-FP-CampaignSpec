import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const original = await prisma.campaign.findUnique({ where: { id } });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id: _id, createdAt: _c, updatedAt: _u, folderId: _f, ...fields } = original;
  const copy = await prisma.campaign.create({
    data: {
      ...fields,
      campaignName: fields.campaignName ? `${fields.campaignName}Copy` : undefined,
      status: "draft",
    },
  });

  return NextResponse.json(copy, { status: 201 });
}
