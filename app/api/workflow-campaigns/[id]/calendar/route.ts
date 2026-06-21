import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDaysUtc, dateOnlyUtc, toIcs, type IcsEvent } from "@/lib/ics";
import { STAGE_CONFIG, isValidStage } from "@/lib/workflow/stages";

// Per-campaign ICS feed. One all-day event per TimelineItem at its target
// date — the kind of thing Strategy can subscribe to in Outlook/Google so
// upcoming stage targets show on their calendar. Closed items are included
// so the feed doubles as a historical record.
//
// Path ends in /calendar (no extension); we set the Content-Type so clients
// recognize it. Add ?download=1 to force the .ics filename in the response
// instead of inline preview.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const download = req.nextUrl.searchParams.get("download") === "1";

  const campaign = await prisma.workflowCampaign.findUnique({
    where: { id },
    select: {
      id: true, name: true, client: true,
      timeline: { orderBy: { targetDate: "asc" } },
    },
  });
  if (!campaign) {
    return new Response("Campaign not found", { status: 404 });
  }

  const events: IcsEvent[] = [];
  for (const t of campaign.timeline) {
    const label = isValidStage(t.stage) ? STAGE_CONFIG[t.stage].label : t.stage;
    const start = t.targetDate;
    const summary = `[${campaign.name}] ${label}${t.actualDate ? " ✓" : ""}`;
    const description = [
      `Stage: ${t.stage}`,
      `Status: ${t.status}`,
      t.riskReason ? `Risk: ${t.riskReason}` : null,
      t.actualDate ? `Completed: ${t.actualDate.toISOString().slice(0, 10)}` : null,
    ].filter(Boolean).join("\n");
    events.push({
      uid: `${t.id}@om-fp-campaignspec`,
      summary,
      description,
      startDate: dateOnlyUtc(start),
      endDate: dateOnlyUtc(addDaysUtc(start, 1)),
      status: t.actualDate ? "CONFIRMED" : t.status === "late" || t.status === "atRisk" ? "TENTATIVE" : "CONFIRMED",
    });
  }

  const body = toIcs(events, {
    calendarName: `${campaign.name} — ${campaign.client}`,
    prodId: "OM-FP-CampaignSpec",
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${campaign.id}-timeline.ics"`;
  }
  return new Response(body, { headers });
}
