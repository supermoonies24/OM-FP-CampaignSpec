import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const entries = await prisma.seedListEntry.findMany({ where: { campaignId } });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const body = await request.json();
  const entry = await prisma.seedListEntry.create({ data: { ...body, campaignId } });
  return NextResponse.json(entry, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId: _c } = await params;
  const { id, ...data } = await request.json();
  const entry = await prisma.seedListEntry.update({ where: { id }, data });
  return NextResponse.json(entry);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId: _c } = await params;
  const { id } = await request.json();
  await prisma.seedListEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
