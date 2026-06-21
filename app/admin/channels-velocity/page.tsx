"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PerStageStat {
  stage: string;
  label: string;
  slaDays: number;
  avgActualDays: number | null;
  onTimeCount: number;
  lateCount: number;
  openCount: number;
}

interface ChannelStat {
  channel: string;
  ownedStages: string[];
  totalClosed: number;
  totalOnTime: number;
  totalLate: number;
  onTimeRate: number | null;
  openItems: number;
  oldestOpenDays: number | null;
  perStage: PerStageStat[];
}

export default function ChannelsVelocityPage() {
  const [channels, setChannels] = useState<ChannelStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/channels-velocity");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as { channels: ChannelStat[] };
      setChannels(j.channels);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(ch: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Gauge className="h-5 w-5" />
        <div>
          <h1 className="font-semibold">Channel Velocity</h1>
          <p className="text-xs text-muted-foreground">Per-channel performance: on-time rate, throughput, and bottlenecks</p>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && channels.length === 0 && <p className="text-sm text-muted-foreground">Loading…</p>}

        {channels.map((ch) => {
          const isOpen = expanded.has(ch.channel);
          const rate = ch.onTimeRate;
          const ratePct = rate == null ? "—" : `${(rate * 100).toFixed(0)}%`;
          const rateColor = rate == null ? "" : rate >= 0.85 ? "text-emerald-600" : rate >= 0.6 ? "text-amber-600" : "text-destructive";
          return (
            <section key={ch.channel} className="rounded-lg border bg-card">
              <button
                type="button"
                onClick={() => toggle(ch.channel)}
                className="w-full px-5 py-4 text-left flex items-center gap-4 hover:bg-accent/30"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm">{ch.channel}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Owns {ch.ownedStages.length} stage{ch.ownedStages.length === 1 ? "" : "s"} · {ch.openItems} open
                  </p>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <p className={`text-lg font-semibold tabular-nums ${rateColor}`}>{ratePct}</p>
                  <p className="text-muted-foreground">on-time ({ch.totalOnTime}/{ch.totalClosed})</p>
                </div>
                <div className="text-right text-xs space-y-0.5 hidden md:block min-w-[6rem]">
                  <p className="text-lg font-semibold tabular-nums">{ch.openItems}</p>
                  <p className="text-muted-foreground">open items</p>
                </div>
                <div className="text-right text-xs space-y-0.5 hidden md:block min-w-[6rem]">
                  <p className="text-lg font-semibold tabular-nums">
                    {ch.oldestOpenDays != null ? `${ch.oldestOpenDays}d` : "—"}
                  </p>
                  <p className="text-muted-foreground">oldest open</p>
                </div>
                <span className="text-muted-foreground text-xs ml-2">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th className="text-left py-1.5 px-4">Stage</th>
                        <th className="text-right py-1.5 px-4">SLA</th>
                        <th className="text-right py-1.5 px-4">Avg actual</th>
                        <th className="text-right py-1.5 px-4">On-time</th>
                        <th className="text-right py-1.5 px-4">Late</th>
                        <th className="text-right py-1.5 px-4">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ch.perStage.map((s) => {
                        const overSla = s.avgActualDays != null && s.avgActualDays > s.slaDays;
                        return (
                          <tr key={s.stage} className="border-b last:border-0">
                            <td className="py-1.5 px-4">
                              <span className="font-medium">{s.label}</span>{" "}
                              <span className="text-muted-foreground">({s.stage})</span>
                            </td>
                            <td className="py-1.5 px-4 text-right tabular-nums">{s.slaDays}d</td>
                            <td className={`py-1.5 px-4 text-right tabular-nums ${overSla ? "text-amber-600" : ""}`}>
                              {s.avgActualDays != null ? `${s.avgActualDays.toFixed(1)}d` : "—"}
                            </td>
                            <td className="py-1.5 px-4 text-right tabular-nums">{s.onTimeCount}</td>
                            <td className="py-1.5 px-4 text-right tabular-nums">
                              {s.lateCount > 0 && (
                                <Badge variant="destructive" className="text-[10px]">{s.lateCount}</Badge>
                              )}
                              {s.lateCount === 0 && "0"}
                            </td>
                            <td className="py-1.5 px-4 text-right tabular-nums">{s.openCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}

        {!loading && channels.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            No channel data yet — run some campaigns first.
          </div>
        )}
      </div>
    </div>
  );
}
