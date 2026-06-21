"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, RefreshCw, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  createdAt: string;
}

interface Summary {
  total: number;
  counts: Record<string, number>;
  tokensIn: number;
  tokensOut: number;
  fallbackRate: number;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  sinceHours: number;
  byFeature: Record<
    string,
    { count: number; tokensIn: number; tokensOut: number; fallbacks: number }
  >;
}

interface ApiResponse {
  summary: Summary;
  rows: RunRow[];
}

const FEATURES = ["", "brief_generator", "risk_scorer"];
const STATUSES = ["", "ok", "fallback", "error"];
const WINDOWS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
];

function fmtCount(n: number): string {
  return n.toLocaleString();
}

export default function AiRunsAdminPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feature, setFeature] = useState("");
  const [status, setStatus] = useState("");
  const [hours, setHours] = useState(168);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sinceHours: String(hours), limit: "200" });
      if (feature) params.set("feature", feature);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/ai-runs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [feature, status, hours]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  const fallbackPct = useMemo(
    () => (summary ? (summary.fallbackRate * 100).toFixed(1) : "0.0"),
    [summary],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Bot className="h-5 w-5" />
        <div>
          <h1 className="font-semibold">AI Runs</h1>
          <p className="text-xs text-muted-foreground">Claude API call history across all campaigns</p>
        </div>
        <div className="flex-1" />

        <div className="flex items-center rounded-md border p-0.5 text-xs">
          {WINDOWS.map((w) => (
            <button
              key={w.hours}
              type="button"
              onClick={() => setHours(w.hours)}
              className={`px-2.5 py-1 rounded ${hours === w.hours ? "bg-accent" : "text-muted-foreground"}`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <select
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          className="text-xs border rounded px-2 py-1 bg-background"
        >
          {FEATURES.map((f) => (
            <option key={f} value={f}>{f || "all features"}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs border rounded px-2 py-1 bg-background"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || "all statuses"}</option>
          ))}
        </select>

        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {summary && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Total runs" value={fmtCount(summary.total)} />
              <Stat
                label="Fallback rate"
                value={`${fallbackPct}%`}
                tone={summary.fallbackRate > 0.2 ? "warn" : "ok"}
              />
              <Stat label="Tokens in" value={fmtCount(summary.tokensIn)} />
              <Stat label="Tokens out" value={fmtCount(summary.tokensOut)} />
              <Stat
                label="p50 / p95 ms"
                value={`${summary.p50LatencyMs ?? "—"} / ${summary.p95LatencyMs ?? "—"}`}
              />
            </section>

            <section className="rounded-lg border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-sm">By feature</h3>
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-1.5 pr-3">Feature</th>
                    <th className="text-right py-1.5 pr-3">Runs</th>
                    <th className="text-right py-1.5 pr-3">Fallbacks</th>
                    <th className="text-right py-1.5 pr-3">Tokens in</th>
                    <th className="text-right py-1.5 pr-3">Tokens out</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.byFeature).map(([feat, agg]) => (
                    <tr key={feat} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">{feat}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{fmtCount(agg.count)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {fmtCount(agg.fallbacks)} ({agg.count > 0 ? ((agg.fallbacks / agg.count) * 100).toFixed(0) : 0}%)
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{fmtCount(agg.tokensIn)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{fmtCount(agg.tokensOut)}</td>
                    </tr>
                  ))}
                  {Object.keys(summary.byFeature).length === 0 && (
                    <tr><td className="py-3 text-muted-foreground" colSpan={5}>No runs in this window.</td></tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}

        <section className="rounded-lg border bg-card">
          <div className="px-4 py-2.5 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Recent runs ({rows.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-1.5 px-3">When</th>
                  <th className="text-left py-1.5 px-3">Campaign</th>
                  <th className="text-left py-1.5 px-3">Feature</th>
                  <th className="text-left py-1.5 px-3">Status</th>
                  <th className="text-right py-1.5 px-3">In</th>
                  <th className="text-right py-1.5 px-3">Out</th>
                  <th className="text-right py-1.5 px-3">ms</th>
                  <th className="text-left py-1.5 px-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30">
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <Link href={`/admin/ai-runs/${r.id}`} className="hover:underline">
                        {format(new Date(r.createdAt), "MMM d HH:mm:ss")}
                      </Link>
                    </td>
                    <td className="py-1.5 px-3 truncate max-w-[14rem]">
                      {r.campaignId && r.campaign?.name ? (
                        <Link href={`/workflow/${r.campaignId}`} className="hover:underline">
                          {r.campaign.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">{r.feature}</td>
                    <td className="py-1.5 px-3">
                      <Badge variant={r.status === "ok" ? "default" : r.status === "fallback" ? "secondary" : "destructive"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{r.tokensIn ?? "—"}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{r.tokensOut ?? "—"}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{r.durationMs ?? "—"}</td>
                    <td className="py-1.5 px-3 text-muted-foreground truncate max-w-[18rem]" title={r.output?.error ?? r.model}>
                      {r.output?.error ?? r.model}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr><td className="py-6 px-3 text-center text-muted-foreground" colSpan={8}>No runs match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-1 ${tone === "warn" ? "text-amber-500" : ""}`}>{value}</p>
    </div>
  );
}
