import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      folder: { select: { id: true, name: true } },
      _count: { select: { emailSends: true } },
    },
  });
  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const campaign = await prisma.campaign.create({
    data: {
      brand: "Ford Pro",
      numSends: 1,
      sendFromAddress: "reply@e.fordpro.com",
      status: "draft",
      ...body,
    },
  });
  return NextResponse.json(campaign, { status: 201 });
}
