import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const folders = await prisma.folder.findMany({
    orderBy: { name: "asc" },
    include: {
      children: {
        orderBy: { name: "asc" },
        include: {
          children: { orderBy: { name: "asc" } },
        },
      },
    },
  });
  // Return only top-level folders (no parentId)
  return NextResponse.json(folders.filter((f) => !f.parentId));
}

export async function POST(request: NextRequest) {
  const { name, parentId } = await request.json();
  const folder = await prisma.folder.create({
    data: { name, parentId: parentId ?? null },
  });
  return NextResponse.json(folder, { status: 201 });
}
