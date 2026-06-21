"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Activity } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CampaignTabs } from "@/components/workflow/CampaignTabs";
import { STAGE_CONFIG, STAGES, isValidStage } from "@/lib/workflow/stages";
import { CHANNEL_LABELS } from "@/lib/workflow/channels";

interface TimelineItem {
  id: string;
  stage: string;
  enteredAt: string | null;
  targetDate: string;
  actualDate: string | null;
  status: string;
  riskScore: number | null;
  riskReason: string | null;
}

interface WorkflowCampaignDetail {
  id: string;
  name: string;
  client: string;
  currentStage: string;
  createdAt: string;
  timeline: TimelineItem[];
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  complete: "secondary",
  onTrack: "default",
  atRisk: "destructive",
  late: "destructive",
};

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<WorkflowCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCampaign(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  async function recomputeRisk() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${id}/score-risk`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Risk scoring failed");
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error && !campaign) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!campaign) return null;

  const today = new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href={`/workflow/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold truncate">{campaign.name}</h1>
          <p className="text-xs text-muted-foreground truncate">{campaign.client}</p>
        </div>
        <div className="flex-1" />
        <CampaignTabs campaignId={campaign.id} active="timeline" />
        <Button size="sm" variant="outline" onClick={recomputeRisk} disabled={loading}>
          <Activity className="h-3.5 w-3.5" />
          Score risk
        </Button>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {campaign.timeline.length === 0 && (
          <p className="text-sm text-muted-foreground">No timeline items yet — advance the campaign to populate.</p>
        )}

        {campaign.timeline.length > 0 && (
          <GanttPanel campaign={campaign} today={today} />
        )}

        <div className="rounded-lg border bg-card divide-y">
          {campaign.timeline.map((item) => {
            const target = new Date(item.targetDate);
            const actual = item.actualDate ? new Date(item.actualDate) : null;
            const isCurrent = item.stage === campaign.currentStage && !actual;
            const config = isValidStage(item.stage) ? STAGE_CONFIG[item.stage] : null;
            const reference = actual ?? today;
            const delta = differenceInCalendarDays(target, reference);

            return (
              <div key={item.id} className={`px-5 py-4 ${isCurrent ? "bg-accent/30" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {config?.label ?? item.stage}
                      {isCurrent && <span className="ml-2 text-xs text-muted-foreground">(current)</span>}
                    </p>
                    {config && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {CHANNEL_LABELS[config.ownerChannel]} · {config.slaDays}d SLA · {config.gate}
                      </p>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANTS[item.status] ?? "outline"}>{item.status}</Badge>
                </div>

                <dl className="grid grid-cols-3 gap-3 text-xs mt-3">
                  <Cell label="Target" value={format(target, "MMM d, yyyy")} />
                  <Cell label="Actual" value={actual ? format(actual, "MMM d, yyyy") : "—"} />
                  <Cell
                    label={actual ? "vs target" : "remaining"}
                    value={
                      actual
                        ? delta === 0
                          ? "on target"
                          : delta > 0
                            ? `${delta}d early`
                            : `${Math.abs(delta)}d late`
                        : delta >= 0
                          ? `${delta}d left`
                          : `${Math.abs(delta)}d over`
                    }
                    tone={
                      actual
                        ? delta >= 0 ? "good" : "bad"
                        : delta >= 0 ? "neutral" : "bad"
                    }
                  />
                </dl>

                {item.riskReason && (
                  <p className="text-xs text-amber-700 mt-2">⚠ {item.riskReason}</p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Stages not yet entered: {STAGES.filter((s) => !campaign.timeline.some((t) => t.stage === s)).length} of {STAGES.length}.
        </p>
      </div>
    </div>
  );
}

function Cell({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  return (
    <div>
      <dt className="text-muted-foreground uppercase tracking-wide text-[10px]">{label}</dt>
      <dd className={
        tone === "good" ? "text-green-700" : tone === "bad" ? "text-destructive" : ""
      }>
        {value}
      </dd>
    </div>
  );
}

// Compact Gantt: horizontal bars per stage, anchored at campaign kickoff
// (createdAt). Bar spans from enteredAt → actualDate (closed), or from the
// brief-seeded targetDate back to (targetDate - slaDays) for future stages we
// haven't reached yet. Today's date is overlaid as a thin vertical line.
function GanttPanel({
  campaign,
  today,
}: {
  campaign: WorkflowCampaignDetail;
  today: Date;
}) {
  const kickoff = new Date(campaign.createdAt);
  const ms = (d: Date) => d.getTime();

  const rows = campaign.timeline.map((t) => {
    const target = new Date(t.targetDate);
    const actual = t.actualDate ? new Date(t.actualDate) : null;
    const slaDays = isValidStage(t.stage) ? STAGE_CONFIG[t.stage].slaDays : 1;
    const entered = t.enteredAt ? new Date(t.enteredAt) : null;
    const start = entered ?? new Date(target.getTime() - slaDays * 86400_000);
    const end = actual ?? target;
    return { ...t, start, end, isOpen: !actual };
  });
  if (rows.length === 0) return null;

  const minDate = rows.reduce<Date>(
    (m, r) => (ms(r.start) < ms(m) ? r.start : m),
    kickoff,
  );
  const maxDate = rows.reduce<Date>(
    (m, r) => (ms(r.end) > ms(m) ? r.end : m),
    today,
  );
  const span = Math.max(1, ms(maxDate) - ms(minDate));
  const pct = (d: Date) => ((ms(d) - ms(minDate)) / span) * 100;
  const todayPct = pct(today);

  const colorFor = (status: string): string => {
    switch (status) {
      case "complete": return "bg-emerald-500/70";
      case "atRisk": return "bg-amber-500/70";
      case "late": return "bg-destructive/70";
      default: return "bg-blue-500/70";
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Gantt overview</span>
        <span className="tabular-nums">
          {format(minDate, "MMM d")} → {format(maxDate, "MMM d, yyyy")}
        </span>
      </div>
      <div className="relative">
        {/* today marker */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div
            className="absolute top-0 bottom-0 border-l border-dashed border-foreground/40 pointer-events-none z-10"
            style={{ left: `${todayPct}%` }}
            title={`Today: ${format(today, "MMM d, yyyy")}`}
          />
        )}
        <ul className="space-y-1">
          {rows.map((r) => {
            const left = Math.max(0, Math.min(100, pct(r.start)));
            const width = Math.max(1.2, pct(r.end) - left);
            const label = isValidStage(r.stage) ? STAGE_CONFIG[r.stage].label : r.stage;
            return (
              <li key={r.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-44 truncate text-muted-foreground" title={label}>{label}</span>
                <div className="flex-1 relative h-3 bg-muted/40 rounded">
                  <div
                    className={`absolute top-0 bottom-0 rounded ${colorFor(r.status)} ${r.isOpen ? "" : "opacity-90"}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${label} · ${r.status}`}
                  />
                </div>
                <span className="w-12 text-right tabular-nums text-muted-foreground">
                  {format(r.end, "MMM d")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
