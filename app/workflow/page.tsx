"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, LayoutGrid, List, Search, Activity } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { STAGES, STAGE_CONFIG, isValidStage, type Stage } from "@/lib/workflow/stages";
import { CHANNEL_LABELS } from "@/lib/workflow/channels";
import { cn } from "@/lib/utils";

interface OpenTimelineItem {
  id: string;
  stage: string;
  targetDate: string;
  status: string;
  riskScore: number | null;
  riskReason: string | null;
}

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
  timeline: OpenTimelineItem[];
  _count: { stageHistory: number; approvals: number; comments: number };
}

const STATUS_DOT: Record<string, string> = {
  complete: "bg-muted",
  onTrack: "bg-green-500",
  atRisk: "bg-amber-500",
  late: "bg-red-500",
};

const STATUS_CHIP_LABELS: Record<string, string> = {
  onHold: "Hold",
  cancelled: "Cancelled",
  shipped: "Shipped",
};
const STATUS_CHIP_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  onHold: "outline",
  cancelled: "destructive",
  shipped: "secondary",
};

function StatusChip({ status }: { status: string }) {
  return <Badge variant={STATUS_CHIP_VARIANTS[status] ?? "outline"} className="text-[9px]">{STATUS_CHIP_LABELS[status] ?? status}</Badge>;
}

function RiskDot({ campaign }: { campaign: WorkflowCampaignSummary }) {
  const open = campaign.timeline[0];
  if (!open) return null;
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[open.status] ?? "bg-muted"}`}
      title={open.riskReason ? `${open.status} · ${open.riskReason}` : open.status}
    />
  );
}

export default function WorkflowBoardPage() {
  const [campaigns, setCampaigns] = useState<WorkflowCampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [hideClosed, setHideClosed] = useState(true);

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

  async function scoreAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow-campaigns/score-risk", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Risk scoring failed");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    let active = 0, late = 0, atRisk = 0, shipped = 0, cancelled = 0;
    for (const c of campaigns) {
      if (c.status === "shipped") shipped++;
      else if (c.status === "cancelled") cancelled++;
      else {
        active++;
        const open = c.timeline[0];
        if (open?.status === "late") late++;
        else if (open?.status === "atRisk") atRisk++;
      }
    }
    return { active, late, atRisk, shipped, cancelled };
  }, [campaigns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (hideClosed && (c.status === "cancelled" || c.status === "shipped")) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.client.toLowerCase().includes(q);
    });
  }, [campaigns, search, hideClosed]);

  const byStage = useMemo(() => {
    const map = new Map<Stage, WorkflowCampaignSummary[]>();
    for (const s of STAGES) map.set(s, []);
    for (const c of filtered) {
      const stage = (STAGES as readonly string[]).includes(c.currentStage)
        ? (c.currentStage as Stage)
        : STAGES[0];
      map.get(stage)!.push(c);
    }
    return map;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/campaigns" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-semibold">Workflow Board</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{stats.active} active</span>
            {stats.late > 0 && <span className="text-red-600">· {stats.late} late</span>}
            {stats.atRisk > 0 && <span className="text-amber-600">· {stats.atRisk} at risk</span>}
            <span>· {stats.shipped + stats.cancelled} closed</span>
          </p>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-8 h-8 text-sm w-48"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} />
          Hide closed
        </label>
        <div className="flex items-center rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => setView("board")}
            className={cn("p-1.5 rounded", view === "board" ? "bg-accent" : "text-muted-foreground hover:text-foreground")}
            title="Board"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn("p-1.5 rounded", view === "list" ? "bg-accent" : "text-muted-foreground hover:text-foreground")}
            title="List"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
        <Button size="sm" variant="outline" onClick={scoreAll} disabled={loading} title="Recompute risk for every open timeline item">
          <Activity className="h-3.5 w-3.5" />
          Score risk
        </Button>
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

      {!loading && campaigns.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-sm text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <LayoutGrid className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold">No campaigns yet</h2>
              <p className="text-sm text-muted-foreground">
                Start by submitting an intake. The campaign will land in the first column of the board.
              </p>
            </div>
            <Link href="/intake">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                Submit first intake
              </Button>
            </Link>
          </div>
        </div>
      )}

      {campaigns.length > 0 && view === "list" && <ListView campaigns={filtered} />}

      {campaigns.length > 0 && view === "board" && <ScrollArea className="flex-1">
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
                      <div className="flex items-center gap-2">
                        <RiskDot campaign={c} />
                        <p className="text-sm font-medium leading-tight truncate flex-1">{c.name}</p>
                        {c.status !== "active" && <StatusChip status={c.status} />}
                      </div>
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
      </ScrollArea>}
    </div>
  );
}

function ListView({ campaigns }: { campaigns: WorkflowCampaignSummary[] }) {
  if (campaigns.length === 0) {
    return <div className="px-6 py-12 text-sm text-muted-foreground text-center">No campaigns match.</div>;
  }
  return (
    <div className="px-4 py-4">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Client</th>
              <th className="text-left px-4 py-2 font-medium">Stage</th>
              <th className="text-left px-4 py-2 font-medium">Owner</th>
              <th className="text-right px-4 py-2 font-medium">Updated</th>
              <th className="text-right px-4 py-2 font-medium">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {campaigns.map((c) => {
              const stage = isValidStage(c.currentStage) ? c.currentStage : null;
              const config = stage ? STAGE_CONFIG[stage] : null;
              return (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <Link href={`/workflow/${c.id}`} className="font-medium hover:underline inline-flex items-center gap-2">
                      <RiskDot campaign={c} />
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.client}</td>
                  <td className="px-4 py-2.5">{config?.label ?? c.currentStage}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {config ? CHANNEL_LABELS[config.ownerChannel] : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                    {formatDistanceToNowStrict(new Date(c.updatedAt))} ago
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                    {c._count.stageHistory}t · {c._count.approvals}a · {c._count.comments}c
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
