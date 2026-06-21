"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, RefreshCw, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AiRunDetail {
  id: string;
  campaignId: string | null;
  campaign: { id: string; name: string; client: string; currentStage: string } | null;
  feature: string;
  model: string;
  status: string;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number | null;
  createdAt: string;
  input: unknown;
  output: unknown;
}

export default function AiRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<AiRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-runs/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRun(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/admin/ai-runs" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Bot className="h-5 w-5" />
        <div>
          <h1 className="font-semibold">AI Run</h1>
          <p className="text-xs text-muted-foreground font-mono">{id}</p>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && !run && <p className="text-sm text-muted-foreground">Loading…</p>}

        {run && (
          <>
            <section className="rounded-lg border bg-card p-5 space-y-3">
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <Badge>{run.feature}</Badge>
                <Badge variant={run.status === "ok" ? "default" : run.status === "fallback" ? "secondary" : "destructive"}>
                  {run.status}
                </Badge>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{run.model}</code>
                <span className="text-muted-foreground text-xs">{format(new Date(run.createdAt), "PPpp")}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Tokens in" value={run.tokensIn?.toLocaleString() ?? "—"} />
                <Stat label="Tokens out" value={run.tokensOut?.toLocaleString() ?? "—"} />
                <Stat label="Duration" value={run.durationMs != null ? `${run.durationMs} ms` : "—"} />
                <Stat
                  label="Campaign"
                  value={run.campaign ? run.campaign.name : "—"}
                  href={run.campaign ? `/workflow/${run.campaign.id}` : undefined}
                />
              </div>
            </section>

            <JsonPanel title="Input" data={run.input} />
            <JsonPanel title="Output" data={run.output} />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <div className="rounded border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-1 truncate" title={value}>{value}</p>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-80">{inner}</Link> : inner;
}

function JsonPanel({ title, data }: { title: string; data: unknown }) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="px-4 py-2.5 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <pre className="text-xs p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
        {data === null || data === undefined ? <span className="text-muted-foreground">(empty)</span> : JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}
