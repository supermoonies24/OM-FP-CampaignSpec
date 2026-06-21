"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, LayoutGrid, List, Search, Activity, Download, Layers } from "lucide-react";
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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkAdvance() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Advance ${selectedIds.size} campaign${selectedIds.size === 1 ? "" : "s"} to the next stage? Signoff gates will still be enforced.`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workflow-campaigns/bulk-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { advanced: number; blocked: number };
      setSelectedIds(new Set());
      alert(`Advanced: ${json.advanced} · Blocked by gate: ${json.blocked}`);
      await load(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk advance failed");
      setLoading(false);
    }
  }

  async function bulkStatus(status: string) {
    if (selectedIds.size === 0) return;
    if (!confirm(`Set status to "${status}" for ${selectedIds.size} campaign${selectedIds.size === 1 ? "" : "s"}?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workflow-campaigns/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSelectedIds(new Set());
      await load(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk status change failed");
      setLoading(false);
    }
  }

  async function load(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const url = q && q.trim()
        ? `/api/workflow-campaigns?q=${encodeURIComponent(q.trim())}`
        : "/api/workflow-campaigns";
      const res = await fetch(url);
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

  // Debounced server-side search. Empty query reloads the full list.
  useEffect(() => {
    const q = search.trim();
    const t = setTimeout(() => { load(q || undefined); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
    // Server-side search has already narrowed the list — client-side filter
    // only handles the Hide Closed toggle now.
    return campaigns.filter((c) => {
      if (hideClosed && (c.status === "cancelled" || c.status === "shipped")) return false;
      return true;
    });
  }, [campaigns, hideClosed]);

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
        <PresetMenu
          search={search}
          hideClosed={hideClosed}
          view={view}
          onApply={(p) => {
            setSearch(p.query ?? "");
            setHideClosed(p.hideClosed);
            setView(p.view === "list" ? "list" : "board");
          }}
        />
        {view === "list" && (
          <button
            type="button"
            onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
            className={`text-xs border rounded px-2 py-1 ${selectMode ? "bg-accent" : "bg-background hover:bg-accent"}`}
          >
            {selectMode ? `Select on (${selectedIds.size})` : "Select"}
          </button>
        )}
        {selectMode && view === "list" && selectedIds.size > 0 && (
          <>
            <Button size="sm" variant="outline" onClick={bulkAdvance} disabled={loading}>
              Advance {selectedIds.size}
            </Button>
            <select
              onChange={(e) => { if (e.target.value) { bulkStatus(e.target.value); e.target.value = ""; } }}
              defaultValue=""
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value="">Set status…</option>
              <option value="active">Active</option>
              <option value="onHold">On Hold</option>
              <option value="cancelled">Cancelled</option>
              <option value="shipped">Shipped</option>
            </select>
          </>
        )}
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
        <Button size="sm" variant="ghost" onClick={() => load(search)} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Link href="/workflow/compare">
          <Button size="sm" variant="outline" title="Compare two campaigns side by side">
            <Layers className="h-3.5 w-3.5" />
            Compare
          </Button>
        </Link>
        <Button asChild size="sm" variant="outline" title="Download campaigns as CSV (add ?include=timeline for per-stage rows)">
          <a href="/api/workflow-campaigns/export?include=timeline" download>
            <Download className="h-3.5 w-3.5" />
            CSV
          </a>
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

      {campaigns.length > 0 && view === "list" && (
        <ListView
          campaigns={filtered}
          selected={selectMode ? selectedIds : undefined}
          onToggle={selectMode ? toggleSelected : undefined}
        />
      )}

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

function ListView({
  campaigns,
  selected,
  onToggle,
}: {
  campaigns: WorkflowCampaignSummary[];
  selected?: Set<string>;
  onToggle?: (id: string) => void;
}) {
  if (campaigns.length === 0) {
    return <div className="px-6 py-12 text-sm text-muted-foreground text-center">No campaigns match.</div>;
  }
  const selectMode = !!selected && !!onToggle;
  return (
    <div className="px-4 py-4">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {selectMode && <th className="w-8 text-center font-medium"></th>}
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
              const isSelected = selected?.has(c.id) ?? false;
              return (
                <tr key={c.id} className={`hover:bg-muted/30 ${isSelected ? "bg-accent/30" : ""}`}>
                  {selectMode && (
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle!(c.id)}
                      />
                    </td>
                  )}
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

interface Preset {
  id: string;
  name: string;
  query: string | null;
  hideClosed: boolean;
  view: string;
}

function PresetMenu({
  search,
  hideClosed,
  view,
  onApply,
}: {
  search: string;
  hideClosed: boolean;
  view: "board" | "list";
  onApply: (p: Preset) => void;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/workflow-presets");
      if (res.ok) setPresets(await res.json());
    } catch {
      // background
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/workflow-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), query: search, hideClosed, view }),
      });
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/workflow-presets/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs border rounded px-2 py-1 bg-background hover:bg-accent"
      >
        Presets ({presets.length})
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-md border bg-popover shadow-lg z-30 p-2 space-y-2">
          {presets.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No saved presets yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {presets.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs hover:bg-accent/30 rounded px-2 py-1">
                  <button
                    type="button"
                    onClick={() => { onApply(p); setOpen(false); }}
                    className="flex-1 text-left"
                    title={`q:"${p.query ?? ""}" · ${p.hideClosed ? "hide closed" : "all"} · ${p.view}`}
                  >
                    <span className="font-medium">{p.name}</span>{" "}
                    {p.query && <span className="text-muted-foreground">— {p.query}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    disabled={busy}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete preset"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-2 flex items-center gap-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Save current as…"
              className="flex-1 text-xs border rounded px-2 py-1 bg-background"
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            />
            <button
              type="button"
              onClick={save}
              disabled={busy || !name.trim()}
              className="text-xs border rounded px-2 py-1 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
