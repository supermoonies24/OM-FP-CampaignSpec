"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, RefreshCw, Layers, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STAGES, STAGE_CONFIG, isValidStage } from "@/lib/workflow/stages";

interface CampaignSummary {
  id: string;
  name: string;
  client: string;
  status: string;
  currentStage: string;
}

interface TimelineItem {
  id: string;
  stage: string;
  enteredAt: string | null;
  targetDate: string;
  actualDate: string | null;
  status: string;
  riskScore: number | null;
}

interface BriefDeck {
  highLevelJourney: string;
  generatedBy: string;
  version: number;
  createdAt: string;
}

interface CampaignDetail {
  id: string;
  name: string;
  client: string;
  status: string;
  currentStage: string;
  createdAt: string;
  deployedAt: string | null;
  briefDeck: BriefDeck | null;
  timeline: TimelineItem[];
  _count?: { aiRuns: number; notifications: number; comments: number };
}

function ComparePageInner() {
  const params = useSearchParams();
  const aId = params.get("a") ?? "";
  const bId = params.get("b") ?? "";

  const [list, setList] = useState<CampaignSummary[]>([]);
  const [a, setA] = useState<CampaignDetail | null>(null);
  const [b, setB] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/workflow-campaigns")
      .then((r) => r.json())
      .then((data: CampaignSummary[]) => setList(data ?? []))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    if (!aId && !bId) return;
    setLoading(true);
    try {
      const fetchOne = async (id: string): Promise<CampaignDetail | null> => {
        if (!id) return null;
        const res = await fetch(`/api/workflow-campaigns/${id}`);
        if (!res.ok) return null;
        return res.json();
      };
      const [ra, rb] = await Promise.all([fetchOne(aId), fetchOne(bId)]);
      setA(ra);
      setB(rb);
    } finally {
      setLoading(false);
    }
  }, [aId, bId]);

  useEffect(() => { load(); }, [load]);

  const stageOrder = useMemo(() => new Map(STAGES.map((s, i) => [s as string, i])), []);
  const stageIndex = (id: string) => stageOrder.get(id) ?? -1;

  function buildUrl(nextA: string, nextB: string): string {
    const q = new URLSearchParams();
    if (nextA) q.set("a", nextA);
    if (nextB) q.set("b", nextB);
    return `/workflow/compare?${q.toString()}`;
  }

  function swapUrl(): string {
    return buildUrl(bId, aId);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Layers className="h-5 w-5" />
        <div>
          <h1 className="font-semibold">Compare Campaigns</h1>
          <p className="text-xs text-muted-foreground">Side-by-side: stage progress, timeline, brief metadata</p>
        </div>
        <div className="flex-1" />
        <Link href={swapUrl()}>
          <Button size="sm" variant="ghost" title="Swap A ↔ B">
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <section className="grid grid-cols-2 gap-4">
          <PickerColumn label="Campaign A" value={aId} list={list} onChange={(v) => (window.location.href = buildUrl(v, bId))} />
          <PickerColumn label="Campaign B" value={bId} list={list} onChange={(v) => (window.location.href = buildUrl(aId, v))} />
        </section>

        {!aId && !bId && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            Pick two campaigns to compare.
          </div>
        )}

        {(a || b) && (
          <>
            <section className="grid grid-cols-2 gap-4">
              <DetailColumn d={a} />
              <DetailColumn d={b} />
            </section>

            <section className="rounded-lg border bg-card">
              <div className="px-4 py-2.5 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">Stage-by-stage comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left py-1.5 px-3">Stage</th>
                      <th className="text-left py-1.5 px-3">{a?.name ?? "A"}</th>
                      <th className="text-left py-1.5 px-3">{b?.name ?? "B"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAGES.map((stage) => {
                      const ai = a?.timeline.find((t) => t.stage === stage);
                      const bi = b?.timeline.find((t) => t.stage === stage);
                      const label = STAGE_CONFIG[stage].label;
                      return (
                        <tr key={stage} className="border-b last:border-0">
                          <td className="py-1.5 px-3">
                            <span className="font-medium">{label}</span>{" "}
                            <span className="text-muted-foreground">({stage})</span>
                          </td>
                          <TimelineCell item={ai} stageIndex={stageIndex(stage)} currentIndex={a ? stageIndex(a.currentStage) : -1} />
                          <TimelineCell item={bi} stageIndex={stageIndex(stage)} currentIndex={b ? stageIndex(b.currentStage) : -1} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <ComparePageInner />
    </Suspense>
  );
}

function PickerColumn({
  label, value, list, onChange,
}: {
  label: string;
  value: string;
  list: CampaignSummary[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border rounded px-2 py-1.5 bg-background"
      >
        <option value="">— pick a campaign —</option>
        {list.map((c) => (
          <option key={c.id} value={c.id}>{c.name} — {c.currentStage}</option>
        ))}
      </select>
    </div>
  );
}

function DetailColumn({ d }: { d: CampaignDetail | null }) {
  if (!d) {
    return (
      <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        (not selected)
      </div>
    );
  }
  const ownerChannel = isValidStage(d.currentStage) ? STAGE_CONFIG[d.currentStage].ownerChannel : "—";
  let summary = "";
  try {
    if (d.briefDeck?.highLevelJourney) {
      const parsed = JSON.parse(d.briefDeck.highLevelJourney) as { summary?: string };
      summary = parsed.summary ?? "";
    }
  } catch {
    // ignore
  }
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/workflow/${d.id}`} className="font-semibold hover:underline">{d.name}</Link>
          <p className="text-xs text-muted-foreground">{d.client}</p>
        </div>
        <Badge variant="outline">{d.status}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Field label="Current stage" value={d.currentStage} />
        <Field label="Owner channel" value={ownerChannel} />
        <Field label="Created" value={format(new Date(d.createdAt), "MMM d yyyy")} />
        <Field label="Deployed" value={d.deployedAt ? format(new Date(d.deployedAt), "MMM d yyyy") : "—"} />
        <Field label="Brief" value={d.briefDeck ? `v${d.briefDeck.version} (${d.briefDeck.generatedBy})` : "—"} />
        <Field label="Timeline items" value={String(d.timeline.length)} />
      </div>
      {summary && (
        <div className="text-xs">
          <p className="text-muted-foreground mb-1">Brief summary</p>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium truncate" title={value}>{value}</p>
    </div>
  );
}

function TimelineCell({
  item,
  stageIndex,
  currentIndex,
}: {
  item: TimelineItem | undefined;
  stageIndex: number;
  currentIndex: number;
}) {
  if (!item) {
    const phase = stageIndex < currentIndex ? "past" : stageIndex === currentIndex ? "current" : "future";
    return (
      <td className="py-1.5 px-3 text-muted-foreground">
        {phase === "past" ? "(no record)" : phase === "current" ? "(active)" : "(not yet)"}
      </td>
    );
  }
  return (
    <td className="py-1.5 px-3">
      <div className="flex items-center gap-2">
        <Badge
          variant={
            item.status === "complete" ? "outline"
            : item.status === "late" ? "destructive"
            : item.status === "atRisk" ? "secondary"
            : "default"
          }
          className="text-[10px]"
        >
          {item.status}
        </Badge>
        <span className="text-muted-foreground tabular-nums">
          tgt {format(new Date(item.targetDate), "MMM d")}
          {item.actualDate && ` · done ${format(new Date(item.actualDate), "MMM d")}`}
        </span>
        {item.riskScore != null && !item.actualDate && (
          <span className="ml-auto tabular-nums text-muted-foreground">
            risk {(item.riskScore * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </td>
  );
}
