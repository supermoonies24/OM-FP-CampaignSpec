"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { STAGES, STAGE_CONFIG, type Stage } from "@/lib/workflow/stages";
import { CHANNEL_LABELS } from "@/lib/workflow/channels";

interface WorkflowCampaignSummary {
  id: string;
  name: string;
  client: string;
  currentStage: string;
  status: string;
  updatedAt: string;
  createdAt: string;
  figmaUrl: string | null;
  specFormId: string | null;
  _count: { stageHistory: number; approvals: number; comments: number };
}

export default function WorkflowBoardPage() {
  const [campaigns, setCampaigns] = useState<WorkflowCampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow-campaigns");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as WorkflowCampaignSummary[];
      setCampaigns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const byStage = useMemo(() => {
    const map = new Map<Stage, WorkflowCampaignSummary[]>();
    for (const s of STAGES) map.set(s, []);
    for (const c of campaigns) {
      const stage = (STAGES as readonly string[]).includes(c.currentStage)
        ? (c.currentStage as Stage)
        : STAGES[0];
      map.get(stage)!.push(c);
    }
    return map;
  }, [campaigns]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/campaigns" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-semibold">Workflow Board</h1>
          <p className="text-xs text-muted-foreground">
            {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} · 21 stages
          </p>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Link href="/intake">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            New Intake
          </Button>
        </Link>
      </div>

      {error && (
        <div className="px-6 py-3 text-sm text-destructive border-b">{error}</div>
      )}

      <ScrollArea className="flex-1">
        <div className="flex gap-3 p-4 min-w-max">
          {STAGES.map((stage) => {
            const config = STAGE_CONFIG[stage];
            const items = byStage.get(stage) ?? [];
            return (
              <div key={stage} className="w-72 shrink-0 flex flex-col">
                <div className="px-2 pb-2 sticky top-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide">{config.label}</h2>
                    <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {CHANNEL_LABELS[config.ownerChannel]} · {config.gate === "signoff" ? "signoff" : "info"} · {config.slaDays}d SLA
                  </p>
                </div>
                <div className="space-y-2 px-1 pb-4 min-h-[120px]">
                  {items.length === 0 && (
                    <div className="text-[11px] text-muted-foreground/60 px-2 py-3 text-center italic">empty</div>
                  )}
                  {items.map((c) => (
                    <Link
                      key={c.id}
                      href={`/workflow/${c.id}`}
                      className="block rounded-md border bg-card hover:border-foreground/20 hover:shadow-sm transition px-3 py-2.5"
                    >
                      <p className="text-sm font-medium leading-tight truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.client}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span title="Last updated">{formatDistanceToNowStrict(new Date(c.updatedAt))} ago</span>
                        {c._count.comments > 0 && <span>· {c._count.comments} comments</span>}
                        {c._count.approvals > 0 && <span>· {c._count.approvals} approvals</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
