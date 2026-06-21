"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignTabs } from "@/components/workflow/CampaignTabs";

interface BriefDeck {
  id: string;
  highLevelJourney: string;
  sfmcJourney: string;
  timeline: string;
  specFormDraft: string;
  generatedBy: string;
  version: number;
  pptxUrl: string | null;
  createdAt: string;
}

interface WorkflowCampaignDetail {
  id: string; name: string; client: string;
  briefDeck: BriefDeck | null;
}

interface HighLevelJourney { summary: string; touchpoints: { name: string; channel: string; purpose: string }[] }
interface SfmcJourney { name: string; entrySource: string; activities: { kind: string; label: string }[] }
interface TimelineEntry { stage: string; label: string; targetOffsetDays: number }

interface AiRunRow {
  id: string;
  feature: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number | null;
  status: string;
  createdAt: string;
  output: { error?: string } | null;
}

interface SimilarCampaign {
  campaignId: string;
  name: string;
  client: string;
  currentStage: string;
  status: string;
  deployedAt: string | null;
  reason: string;
}

export default function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<WorkflowCampaignDetail | null>(null);
  const [aiRuns, setAiRuns] = useState<AiRunRow[]>([]);
  const [similar, setSimilar] = useState<SimilarCampaign[]>([]);
  const [similarSource, setSimilarSource] = useState<"ai" | "stub" | null>(null);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineText, setRefineText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campRes, runsRes] = await Promise.all([
        fetch(`/api/workflow-campaigns/${id}`),
        fetch(`/api/workflow-campaigns/${id}/ai-runs?limit=20`),
      ]);
      if (!campRes.ok) throw new Error(`HTTP ${campRes.status}`);
      setCampaign(await campRes.json());
      if (runsRes.ok) setAiRuns(await runsRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  async function generate(opts: { instructions?: string } = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${id}/generate-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts.instructions ? { instructions: opts.instructions } : {}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (opts.instructions) {
        setRefineText("");
        setRefineOpen(false);
      }
      await load();
      await loadSimilar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brief generation failed");
    } finally {
      setBusy(false);
    }
  }

  const loadSimilar = useCallback(async () => {
    setSimilarLoading(true);
    try {
      const res = await fetch(`/api/workflow-campaigns/${id}/similar`);
      if (!res.ok) return;
      const j = (await res.json()) as { matches: SimilarCampaign[]; source: "ai" | "stub" };
      setSimilar(j.matches ?? []);
      setSimilarSource(j.source ?? null);
    } finally {
      setSimilarLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSimilar(); }, [loadSimilar]);

  const parsed = useMemo(() => {
    if (!campaign?.briefDeck) return null;
    try {
      return {
        hlj: JSON.parse(campaign.briefDeck.highLevelJourney) as HighLevelJourney,
        sfmc: JSON.parse(campaign.briefDeck.sfmcJourney) as SfmcJourney,
        timeline: JSON.parse(campaign.briefDeck.timeline) as TimelineEntry[],
        specFormDraft: JSON.parse(campaign.briefDeck.specFormDraft) as Record<string, unknown>,
      };
    } catch {
      return null;
    }
  }, [campaign?.briefDeck]);

  if (loading && !campaign) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error && !campaign) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!campaign) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href={`/workflow/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-semibold">{campaign.name}</h1>
          <p className="text-xs text-muted-foreground">Brief Deck</p>
        </div>
        <div className="flex-1" />
        <CampaignTabs campaignId={campaign.id} active="brief" />
        <Button size="sm" variant="ghost" onClick={load} disabled={busy}>
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        </Button>
        {campaign.briefDeck && (
          <Button size="sm" variant="outline" onClick={() => setRefineOpen((v) => !v)} disabled={busy}>
            Refine…
          </Button>
        )}
        <Button size="sm" onClick={() => generate()} disabled={busy}>
          <Sparkles className="h-3.5 w-3.5" />
          {campaign.briefDeck ? `Regenerate (v${campaign.briefDeck.version + 1})` : "Generate"}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {refineOpen && campaign.briefDeck && (
          <section className="rounded-lg border bg-card p-5 space-y-3">
            <div>
              <h3 className="font-semibold">Refine brief v{campaign.briefDeck.version}</h3>
              <p className="text-xs text-muted-foreground">
                Describe what to change. The AI will iterate on the existing brief rather than start from scratch.
              </p>
            </div>
            <textarea
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              rows={3}
              placeholder="e.g. Focus more on Super Duty fleet buyers. Add a test-drive CTA touchpoint."
              className="w-full text-sm border rounded p-2 bg-background"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => generate({ instructions: refineText })} disabled={busy || !refineText.trim()}>
                <Sparkles className="h-3.5 w-3.5" />
                Apply refinement (v{campaign.briefDeck.version + 1})
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setRefineOpen(false); setRefineText(""); }} disabled={busy}>
                Cancel
              </Button>
            </div>
          </section>
        )}

        {!campaign.briefDeck && (
          <div className="rounded-lg border bg-card p-8 text-center space-y-3">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
            <h2 className="font-semibold">No brief generated yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              The Phase 1 generator is a deterministic stub that pulls from the intake form. Phase 2 swaps it for a Claude-generated brief.
            </p>
            <Button onClick={() => generate()} disabled={busy}>
              <Sparkles className="h-3.5 w-3.5" />
              Generate brief
            </Button>
          </div>
        )}

        {campaign.briefDeck && parsed && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <Badge variant="outline">v{campaign.briefDeck.version}</Badge>
              <Badge variant={campaign.briefDeck.generatedBy === "ai" ? "default" : "secondary"}>
                {campaign.briefDeck.generatedBy === "ai" ? "AI" : "Stub"}
              </Badge>
              <span>Generated {format(new Date(campaign.briefDeck.createdAt), "PPp")} by {campaign.briefDeck.generatedBy}</span>
              {campaign.briefDeck.pptxUrl && (
                <Button asChild size="sm" variant="outline" className="ml-auto">
                  <a href={campaign.briefDeck.pptxUrl} download>
                    <Download className="h-3.5 w-3.5" />
                    Download .pptx
                  </a>
                </Button>
              )}
            </div>

            <section className="rounded-lg border bg-card p-5 space-y-3">
              <h3 className="font-semibold">High-Level Journey</h3>
              <p className="text-sm">{parsed.hlj.summary}</p>
              <ul className="space-y-2 text-sm">
                {parsed.hlj.touchpoints.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <Badge variant="secondary" className="shrink-0">{t.channel}</Badge>
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.purpose}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border bg-card p-5 space-y-3">
              <h3 className="font-semibold">SFMC Journey</h3>
              <p className="text-sm text-muted-foreground">
                <strong>{parsed.sfmc.name}</strong> · entry: {parsed.sfmc.entrySource}
              </p>
              <ol className="space-y-1 text-sm">
                {parsed.sfmc.activities.map((a, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{i + 1}.</span>
                    <Badge variant="outline" className="shrink-0">{a.kind}</Badge>
                    <span>{a.label}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border bg-card p-5 space-y-2">
              <h3 className="font-semibold">Suggested Timeline</h3>
              <p className="text-xs text-muted-foreground">Cumulative target days from kickoff per stage.</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {parsed.timeline.map((t) => (
                  <div key={t.stage} className="flex justify-between gap-3">
                    <span className="truncate">{t.label}</span>
                    <span className="text-muted-foreground tabular-nums">D+{t.targetOffsetDays}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border bg-card p-5 space-y-2">
              <h3 className="font-semibold">Spec Form Draft</h3>
              <p className="text-xs text-muted-foreground">Pre-fills applied when this campaign reaches the Build Spec Form stage.</p>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                {Object.entries(parsed.specFormDraft).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-lg border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Similar Past Campaigns</h3>
                {similarSource && (
                  <Badge variant={similarSource === "ai" ? "default" : "secondary"} className="text-[10px]">
                    {similarSource === "ai" ? "AI-ranked" : "Most recent"}
                  </Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {similarLoading ? "loading…" : `${similar.length} match${similar.length === 1 ? "" : "es"}`}
                </span>
              </div>
              {similar.length === 0 && !similarLoading && (
                <p className="text-xs text-muted-foreground">No comparable past campaigns yet.</p>
              )}
              {similar.length > 0 && (
                <ul className="space-y-2">
                  {similar.map((s) => (
                    <li key={s.campaignId} className="rounded border p-3 hover:bg-accent/30">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/workflow/${s.campaignId}`} className="font-medium text-sm hover:underline">
                          {s.name}
                        </Link>
                        <Badge variant="outline" className="text-[10px]">{s.currentStage}</Badge>
                        <span className="text-xs text-muted-foreground">· {s.client}</span>
                        {s.deployedAt && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            shipped {format(new Date(s.deployedAt), "MMM d yyyy")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border bg-card p-5 space-y-3">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold">AI Run History</h3>
                <span className="text-xs text-muted-foreground">{aiRuns.length} run{aiRuns.length === 1 ? "" : "s"} · click to {historyOpen ? "hide" : "show"}</span>
              </button>
              {historyOpen && (
                aiRuns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No AI runs recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b">
                          <th className="text-left py-1.5 pr-3">When</th>
                          <th className="text-left py-1.5 pr-3">Feature</th>
                          <th className="text-left py-1.5 pr-3">Status</th>
                          <th className="text-right py-1.5 pr-3">In</th>
                          <th className="text-right py-1.5 pr-3">Out</th>
                          <th className="text-right py-1.5 pr-3">ms</th>
                          <th className="text-left py-1.5">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiRuns.map((r) => (
                          <tr key={r.id} className="border-b last:border-0">
                            <td className="py-1.5 pr-3 whitespace-nowrap">{format(new Date(r.createdAt), "MMM d HH:mm:ss")}</td>
                            <td className="py-1.5 pr-3">{r.feature}</td>
                            <td className="py-1.5 pr-3">
                              <Badge variant={r.status === "ok" ? "default" : r.status === "fallback" ? "secondary" : "destructive"}>
                                {r.status}
                              </Badge>
                            </td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{r.tokensIn ?? "—"}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{r.tokensOut ?? "—"}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{r.durationMs ?? "—"}</td>
                            <td className="py-1.5 text-muted-foreground truncate max-w-[24rem]" title={r.output?.error ?? r.model}>
                              {r.output?.error ?? r.model}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
