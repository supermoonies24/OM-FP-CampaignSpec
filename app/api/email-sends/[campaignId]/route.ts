import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const sends = await prisma.emailSend.findMany({ where: { campaignId }, orderBy: { emailNumber: "asc" } });
  return NextResponse.json(sends);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const body = await request.json();
  const send = await prisma.emailSend.create({ data: { ...body, campaignId } });
  return NextResponse.json(send, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const body = await request.json(); // { sends: EmailSend[] }
  const updated = await Promise.all(
    (body.sends as Array<{ id?: string; emailNumber: number } & Record<string, unknown>>).map(
      async (send) => {
        const { id, campaignId: _c, ...data } = send as { id?: string; campaignId?: string } & Record<string, unknown>;
        if (id) {
          return prisma.emailSend.update({ where: { id }, data });
        }
        return prisma.emailSend.create({ data: { ...data, campaignId, emailNumber: send.emailNumber } as Parameters<typeof prisma.emailSend.create>[0]["data"] });
      }
    )
  );
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const { sendId } = await request.json();
  if (sendId) {
    await prisma.emailSend.delete({ where: { id: sendId } });
  } else {
    await prisma.emailSend.deleteMany({ where: { campaignId } });
  }
  return NextResponse.json({ ok: true });
}
