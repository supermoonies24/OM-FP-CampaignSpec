import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { emailSends: { orderBy: { emailNumber: "asc" } }, links: { orderBy: { emailNumber: "asc" } }, seedLists: true },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  // strip relation fields/objects and read-only fields that aren't valid scalar update inputs
  const { id: _id, createdAt, updatedAt, emailSends, links, seedLists, ...data } = body;
  const campaign = await prisma.campaign.update({ where: { id }, data });
  return NextResponse.json(campaign);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
