"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, RefreshCw, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RiskRow {
  id: string;
  campaignId: string;
  campaign: { id: string; name: string; client: string; currentStage: string; status: string };
  stage: string;
  stageLabel: string;
  ownerChannel: string;
  status: string;
  riskScore: number | null;
  riskReason: string | null;
  targetDate: string;
  enteredAt: string | null;
  daysOverdue: number;
}

interface ApiResponse {
  summary: {
    lateCount: number;
    atRiskCount: number;
    campaignsAffected: number;
    byChannel: Record<string, { late: number; atRisk: number }>;
  };
  rows: RiskRow[];
}

const CHANNELS = ["", "FORD_PRO", "STRATEGY", "AUDIENCE", "CREATIVE", "DEV_OPS", "TECH_DEV"];
const STATUSES = ["", "late", "atRisk"];

export default function RiskDashboardPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (channel) params.set("channel", channel);
      if (status) params.set("status", status);
      const res = await fetch(`/api/risk?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [channel, status]);

  useEffect(() => { load(); }, [load]);

  async function recomputeAll() {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/workflow-campaigns/score-risk", { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recompute failed");
      setLoading(false);
    }
  }

  const rows = data?.rows ?? [];
  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <ShieldAlert className="h-5 w-5" />
        <div>
          <h1 className="font-semibold">Risk Dashboard</h1>
          <p className="text-xs text-muted-foreground">All at-risk and late timeline items across campaigns</p>
        </div>
        <div className="flex-1" />

        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="text-xs border rounded px-2 py-1 bg-background"
        >
          {CHANNELS.map((c) => <option key={c} value={c}>{c || "all channels"}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs border rounded px-2 py-1 bg-background"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s || "all severities"}</option>)}
        </select>

        <Button size="sm" variant="outline" onClick={recomputeAll} disabled={loading}>
          Recompute
        </Button>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {summary && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Stat label="Late items" value={String(summary.lateCount)} tone="bad" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
              <Stat label="At-risk items" value={String(summary.atRiskCount)} tone="warn" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
              <Stat label="Campaigns affected" value={String(summary.campaignsAffected)} />
            </section>

            {Object.keys(summary.byChannel).length > 0 && (
              <section className="rounded-lg border bg-card p-5 space-y-2">
                <h3 className="font-semibold text-sm">By owner channel</h3>
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left py-1.5">Channel</th>
                      <th className="text-right py-1.5">Late</th>
                      <th className="text-right py-1.5">At risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byChannel).map(([ch, c]) => (
                      <tr key={ch} className="border-b last:border-0">
                        <td className="py-1.5">{ch}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.late}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.atRisk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}

        <section className="rounded-lg border bg-card">
          <div className="px-4 py-2.5 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Items needing attention ({rows.length})</h3>
          </div>
          {rows.length === 0 && !loading && (
            <p className="p-6 text-sm text-muted-foreground text-center">Everything is on track. 🎉</p>
          )}
          {rows.length > 0 && (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-3 flex gap-3 items-start">
                  <div className="shrink-0 mt-0.5">
                    <AlertTriangle className={`h-4 w-4 ${r.status === "late" ? "text-destructive" : "text-amber-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/workflow/${r.campaignId}`} className="font-medium text-sm hover:underline">
                        {r.campaign.name}
                      </Link>
                      <Badge variant={r.status === "late" ? "destructive" : "secondary"} className="text-[10px]">{r.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{r.stageLabel}</Badge>
                      <span className="text-xs text-muted-foreground">· {r.ownerChannel}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        target {format(new Date(r.targetDate), "MMM d")}
                        {r.daysOverdue > 0 && ` · ${r.daysOverdue}d over`}
                        {r.daysOverdue < 0 && ` · ${Math.abs(r.daysOverdue)}d to go`}
                      </span>
                    </div>
                    {r.riskReason && (
                      <p className="text-xs text-muted-foreground mt-0.5">{r.riskReason}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {r.riskScore != null ? `${(r.riskScore * 100).toFixed(0)}%` : "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone?: "bad" | "warn"; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-semibold tabular-nums mt-1 ${tone === "bad" ? "text-destructive" : tone === "warn" ? "text-amber-500" : ""}`}>
        {value}
      </p>
    </div>
  );
}
