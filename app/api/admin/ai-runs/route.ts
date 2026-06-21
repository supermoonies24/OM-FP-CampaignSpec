import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Admin endpoint: list AI runs across all campaigns with summary metrics.
//
// Query params:
//   feature=brief_generator | risk_scorer | meeting_suggester
//   status=ok | fallback | error
//   sinceHours=N            — restrict to the last N hours (default 168 = 7d)
//   limit=N                 — row cap (default 100, max 500)

interface RunRow {
  id: string;
  campaignId: string | null;
  campaign: { name: string } | null;
  feature: string;
  model: string;
  status: string;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number | null;
  output: { error?: string } | null;
  createdAt: Date;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const feature = searchParams.get("feature") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const sinceHours = Math.max(1, Math.min(Number(searchParams.get("sinceHours") ?? 168), 24 * 30));
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const where = {
    createdAt: { gte: since },
    ...(feature ? { feature } : {}),
    ...(status ? { status } : {}),
  };

  const [rows, agg] = await Promise.all([
    prisma.aiRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { campaign: { select: { name: true } } },
    }),
    prisma.aiRun.findMany({
      where,
      select: { status: true, tokensIn: true, tokensOut: true, durationMs: true, feature: true },
    }),
  ]);

  // Aggregations: counts by status + feature, token totals, p50/p95 latency
  // across all runs in the window (no time-series — dashboard is static).
  const counts = { ok: 0, fallback: 0, error: 0 } as Record<string, number>;
  let tokensIn = 0;
  let tokensOut = 0;
  const latencies: number[] = [];
  const byFeature: Record<string, { count: number; tokensIn: number; tokensOut: number; fallbacks: number }> = {};

  for (const r of agg) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    if (r.tokensIn) tokensIn += r.tokensIn;
    if (r.tokensOut) tokensOut += r.tokensOut;
    if (typeof r.durationMs === "number") latencies.push(r.durationMs);
    if (!byFeature[r.feature]) byFeature[r.feature] = { count: 0, tokensIn: 0, tokensOut: 0, fallbacks: 0 };
    const f = byFeature[r.feature];
    f.count++;
    if (r.tokensIn) f.tokensIn += r.tokensIn;
    if (r.tokensOut) f.tokensOut += r.tokensOut;
    if (r.status === "fallback") f.fallbacks++;
  }

  latencies.sort((a, b) => a - b);
  const pct = (p: number) =>
    latencies.length === 0 ? null : latencies[Math.min(latencies.length - 1, Math.floor((latencies.length - 1) * p))];

  return NextResponse.json({
    summary: {
      total: agg.length,
      counts,
      tokensIn,
      tokensOut,
      fallbackRate: agg.length === 0 ? 0 : counts.fallback / agg.length,
      p50LatencyMs: pct(0.5),
      p95LatencyMs: pct(0.95),
      sinceHours,
      byFeature,
    },
    rows: rows.map((r): RunRow => ({
      id: r.id,
      campaignId: r.campaignId,
      campaign: r.campaign,
      feature: r.feature,
      model: r.model,
      status: r.status,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      durationMs: r.durationMs,
      output: (() => {
        try {
          const parsed = JSON.parse(r.outputJson) as Record<string, unknown>;
          if (parsed && "error" in parsed) return { error: String(parsed.error) };
          return null;
        } catch {
          return null;
        }
      })(),
      createdAt: r.createdAt,
    })),
  });
}
