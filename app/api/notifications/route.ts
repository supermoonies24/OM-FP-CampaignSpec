import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Global inbox for in-app notifications. v1 has no per-user identity (passcode
// auth only), so "read" is global — anyone marking a notification read does so
// for all users. Phase 6 multi-tenant will need a join table.
//
// Query params:
//   unread=1       — only unread (readAt IS NULL)
//   limit=N        — cap rows (default 50, max 200)
//   counts=1       — return { total, unread } header instead of array
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const unreadOnly = searchParams.get("unread") === "1";
  const countsOnly = searchParams.get("counts") === "1";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  if (countsOnly) {
    const [total, unread] = await Promise.all([
      prisma.workflowNotification.count({ where: { channel: "inApp" } }),
      prisma.workflowNotification.count({ where: { channel: "inApp", readAt: null } }),
    ]);
    return NextResponse.json({ total, unread });
  }

  const notifications = await prisma.workflowNotification.findMany({
    where: {
      channel: "inApp",
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      campaign: { select: { id: true, name: true, currentStage: true, client: true } },
    },
  });

  return NextResponse.json(
    notifications.map((n) => ({
      id: n.id,
      campaignId: n.campaignId,
      campaign: n.campaign,
      kind: n.kind,
      payload: (() => {
        try { return JSON.parse(n.payload) as Record<string, unknown>; }
        catch { return null; }
      })(),
      sentAt: n.sentAt,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
  );
}

// Bulk mark-read: POST with body { ids: string[] } OR { all: true } to clear
// every unread inApp notification in one call (handy "mark all read" button).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; all?: boolean };
  const now = new Date();

  if (body.all) {
    const res = await prisma.workflowNotification.updateMany({
      where: { channel: "inApp", readAt: null },
      data: { readAt: now },
    });
    return NextResponse.json({ updated: res.count });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((s) => typeof s === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Provide ids[] or all:true" }, { status: 400 });
  }
  const res = await prisma.workflowNotification.updateMany({
    where: { id: { in: ids }, channel: "inApp" },
    data: { readAt: now },
  });
  return NextResponse.json({ updated: res.count });
}
