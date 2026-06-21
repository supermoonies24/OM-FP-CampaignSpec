import { NextResponse } from "next/server";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { STAGE_CONFIG, STAGES, isValidStage, type Stage } from "@/lib/workflow/stages";
import type { Channel } from "@/lib/workflow/channels";

// Per-channel performance: how long each channel takes to finish the stages
// they own, vs the SLA, plus their current workload. Channels with the slowest
// on-time rate or most open items are likely bottlenecks.

interface PerStageStat {
  stage: Stage;
  label: string;
  slaDays: number;
  avgActualDays: number | null;  // avg enteredAt → actualDate
  onTimeCount: number;
  lateCount: number;
  openCount: number;
}

interface ChannelStat {
  channel: Channel;
  ownedStages: Stage[];
  totalClosed: number;
  totalOnTime: number;
  totalLate: number;
  onTimeRate: number | null;
  openItems: number;
  oldestOpenDays: number | null;
  perStage: PerStageStat[];
}

export async function GET() {
  const today = new Date();

  // Map stage → owning channel.
  const ownerByStage = new Map<Stage, Channel>();
  const stagesByChannel = new Map<Channel, Stage[]>();
  for (const stage of STAGES) {
    const cfg = STAGE_CONFIG[stage];
    ownerByStage.set(stage, cfg.ownerChannel);
    if (!stagesByChannel.has(cfg.ownerChannel)) stagesByChannel.set(cfg.ownerChannel, []);
    stagesByChannel.get(cfg.ownerChannel)!.push(stage);
  }

  const allItems = await prisma.workflowTimelineItem.findMany({
    select: {
      stage: true,
      enteredAt: true,
      targetDate: true,
      actualDate: true,
      status: true,
      campaign: { select: { createdAt: true } },
    },
  });

  // Group by stage.
  type Group = { actualDurations: number[]; onTime: number; late: number; open: number };
  const byStage = new Map<string, Group>();
  for (const it of allItems) {
    if (!byStage.has(it.stage)) byStage.set(it.stage, { actualDurations: [], onTime: 0, late: 0, open: 0 });
    const g = byStage.get(it.stage)!;
    if (it.actualDate) {
      const anchor = it.enteredAt ?? it.campaign.createdAt;
      const days = differenceInCalendarDays(it.actualDate, anchor);
      if (days >= 0) g.actualDurations.push(days);
      if (it.actualDate <= it.targetDate) g.onTime++;
      else g.late++;
    } else {
      g.open++;
    }
  }

  const result: ChannelStat[] = [];
  for (const [channel, ownedStages] of stagesByChannel) {
    const perStage: PerStageStat[] = ownedStages.map((stage) => {
      const cfg = STAGE_CONFIG[stage];
      const g = byStage.get(stage) ?? { actualDurations: [], onTime: 0, late: 0, open: 0 };
      const avg = g.actualDurations.length > 0
        ? g.actualDurations.reduce((a, b) => a + b, 0) / g.actualDurations.length
        : null;
      return {
        stage,
        label: cfg.label,
        slaDays: cfg.slaDays,
        avgActualDays: avg,
        onTimeCount: g.onTime,
        lateCount: g.late,
        openCount: g.open,
      };
    });

    const totalOnTime = perStage.reduce((s, p) => s + p.onTimeCount, 0);
    const totalLate = perStage.reduce((s, p) => s + p.lateCount, 0);
    const totalClosed = totalOnTime + totalLate;

    // Oldest open item across owned stages.
    let oldestDays: number | null = null;
    for (const it of allItems) {
      if (it.actualDate) continue;
      if (!isValidStage(it.stage)) continue;
      if (ownerByStage.get(it.stage as Stage) !== channel) continue;
      const anchor = it.enteredAt ?? it.campaign.createdAt;
      const days = differenceInCalendarDays(today, anchor);
      if (oldestDays === null || days > oldestDays) oldestDays = days;
    }

    result.push({
      channel,
      ownedStages,
      totalClosed,
      totalOnTime,
      totalLate,
      onTimeRate: totalClosed > 0 ? totalOnTime / totalClosed : null,
      openItems: perStage.reduce((s, p) => s + p.openCount, 0),
      oldestOpenDays: oldestDays,
      perStage,
    });
  }

  // Sort channels: most open items first, then lowest on-time rate.
  result.sort((a, b) => {
    if (b.openItems !== a.openItems) return b.openItems - a.openItems;
    const ar = a.onTimeRate ?? 1;
    const br = b.onTimeRate ?? 1;
    return ar - br;
  });

  return NextResponse.json({ channels: result });
}
