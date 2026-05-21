import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const links = await prisma.campaignLink.findMany({ where: { campaignId }, orderBy: { emailNumber: "asc" } });
  return NextResponse.json(links);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const body = await request.json();
  const link = await prisma.campaignLink.create({ data: { ...body, campaignId } });
  return NextResponse.json(link, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId: _c } = await params;
  const { id, ...data } = await request.json();
  const link = await prisma.campaignLink.update({ where: { id }, data });
  return NextResponse.json(link);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId: _c } = await params;
  const { id } = await request.json();
  await prisma.campaignLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
