"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Sparkles, FileText } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BriefRow {
  id: string;
  version: number;
  generatedBy: string;
  createdAt: string;
  pptxUrl: string | null;
  campaign: { id: string; name: string; client: string; currentStage: string; status: string };
}

export default function AdminTemplatesPage() {
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/briefs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBriefs(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-semibold">Brief Library</h1>
          <p className="text-xs text-muted-foreground">{briefs.length} brief{briefs.length === 1 ? "" : "s"} across all campaigns</p>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-sm text-muted-foreground">
          Every generated brief deck, newest first. Phase 2 will let you save a brief as a reusable template that
          seeds the AI generator with structure and tone for similar future campaigns.
        </p>

        {briefs.length === 0 && (
          <div className="rounded-lg border bg-card p-12 text-center space-y-3">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">No briefs generated yet.</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Generate a brief from any campaign&apos;s Brief tab and it will appear here.
            </p>
          </div>
        )}

        <div className="rounded-lg border bg-card divide-y">
          {briefs.map((b) => (
            <Link
              key={b.id}
              href={`/workflow/${b.campaign.id}/brief`}
              className="block px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{b.campaign.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.campaign.client} · stage {b.campaign.currentStage}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">v{b.version}</Badge>
                <Badge variant="secondary" className="text-[10px]">{b.generatedBy}</Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {format(new Date(b.createdAt), "MMM d")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
