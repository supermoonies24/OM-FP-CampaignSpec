"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
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

export default function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<WorkflowCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${id}/generate-brief`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brief generation failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, [load]);

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
        <Button size="sm" onClick={generate} disabled={busy}>
          <Sparkles className="h-3.5 w-3.5" />
          {campaign.briefDeck ? `Regenerate (v${campaign.briefDeck.version + 1})` : "Generate"}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!campaign.briefDeck && (
          <div className="rounded-lg border bg-card p-8 text-center space-y-3">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
            <h2 className="font-semibold">No brief generated yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              The Phase 1 generator is a deterministic stub that pulls from the intake form. Phase 2 swaps it for a Claude-generated brief.
            </p>
            <Button onClick={generate} disabled={busy}>
              <Sparkles className="h-3.5 w-3.5" />
              Generate brief
            </Button>
          </div>
        )}

        {campaign.briefDeck && parsed && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">v{campaign.briefDeck.version}</Badge>
              Generated {format(new Date(campaign.briefDeck.createdAt), "PPp")} by {campaign.briefDeck.generatedBy}
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
          </>
        )}
      </div>
    </div>
  );
}
