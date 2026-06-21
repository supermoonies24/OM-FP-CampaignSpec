"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, RefreshCw, Activity, ArrowRight, CheckCheck, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Kind = "transition" | "approval" | "comment" | "brief";

interface Entry {
  id: string;
  kind: Kind;
  at: string;
  campaignId: string;
  campaignName: string;
  actor?: string | null;
  stage?: string;
  stageLabel?: string;
  description: string;
}

const KIND_META: Record<Kind, { label: string; icon: React.ReactNode }> = {
  transition: { label: "Stage", icon: <ArrowRight className="h-4 w-4 text-blue-500" /> },
  approval: { label: "Approval", icon: <CheckCheck className="h-4 w-4 text-emerald-500" /> },
  comment: { label: "Comment", icon: <MessageSquare className="h-4 w-4 text-muted-foreground" /> },
  brief: { label: "Brief", icon: <Sparkles className="h-4 w-4 text-violet-500" /> },
};

const WINDOWS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
  { label: "90d", hours: 720 * 3 },
];

export default function ActivityPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState(168);
  const [kinds, setKinds] = useState<Set<Kind>>(new Set(["transition", "approval", "comment", "brief"]));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sinceHours: String(hours),
        limit: "150",
        types: Array.from(kinds).join(","),
      });
      const res = await fetch(`/api/activity?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEntries(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [hours, kinds]);

  useEffect(() => { load(); }, [load]);

  function toggle(k: Kind) {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      // Don't allow empty — last one stays on.
      if (next.size === 0) return prev;
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Activity className="h-5 w-5" />
        <div>
          <h1 className="font-semibold">Activity</h1>
          <p className="text-xs text-muted-foreground">Cross-campaign event stream</p>
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

        <div className="flex items-center rounded-md border p-0.5 text-xs gap-0.5">
          {(["transition", "approval", "comment", "brief"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={`px-2 py-1 rounded ${kinds.has(k) ? "bg-accent" : "text-muted-foreground opacity-60"}`}
              title={KIND_META[k].label}
            >
              {KIND_META[k].label}
            </button>
          ))}
        </div>

        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && entries.length === 0 && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && entries.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            No activity in this window.
          </div>
        )}
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="rounded-lg border bg-card p-3 flex gap-3 items-start">
              <div className="shrink-0 mt-0.5">{KIND_META[e.kind].icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/workflow/${e.campaignId}`} className="font-medium text-sm hover:underline">
                    {e.campaignName}
                  </Link>
                  <Badge variant="outline" className="text-[10px]">{KIND_META[e.kind].label}</Badge>
                  {e.stageLabel && <span className="text-xs text-muted-foreground">{e.stageLabel}</span>}
                  <span className="ml-auto text-xs text-muted-foreground" title={format(new Date(e.at), "PPpp")}>
                    {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-0.5">{e.description}</p>
                {e.actor && <p className="text-xs text-muted-foreground mt-0.5">— {e.actor}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
