"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CampaignTabs } from "@/components/workflow/CampaignTabs";
import { StageRail } from "@/components/workflow/StageRail";
import { STAGES, isValidStage } from "@/lib/workflow/stages";

interface TimelineItem {
  stage: string;
  targetDate: string;
  actualDate: string | null;
  enteredAt: string | null;
  status: string;
  riskScore: number | null;
  riskReason: string | null;
}

interface Approval {
  stage: string;
  channel: string;
  approvedBy: string;
  approvedAt: string;
  notes: string | null;
}

interface StageTransition {
  fromStage: string | null;
  toStage: string;
  transitionedAt: string;
  notes: string | null;
}

interface CampaignDetail {
  id: string;
  name: string;
  client: string;
  currentStage: string;
  stageHistory: StageTransition[];
  approvals: Approval[];
  timeline: TimelineItem[];
}

export default function TrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCampaign({ ...data, timeline: data.timeline ?? [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const currentIdx = campaign && isValidStage(campaign.currentStage)
    ? STAGES.indexOf(campaign.currentStage as never) + 1
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* back */}
        <Link
          href={`/workflow/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to overview
        </Link>

        {/* header */}
        {campaign && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{campaign.client}</p>
            <h1 className="text-xl font-semibold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Stage {currentIdx} of {STAGES.length}
            </p>
          </div>
        )}

        <CampaignTabs campaignId={id} active="tracker" />

        {loading && (
          <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
        )}
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {campaign && (
          <StageRail
            currentStage={campaign.currentStage}
            timeline={campaign.timeline}
            approvals={campaign.approvals}
            stageHistory={campaign.stageHistory}
          />
        )}
      </div>
    </div>
  );
}
