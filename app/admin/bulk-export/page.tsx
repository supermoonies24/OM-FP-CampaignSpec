"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CampaignRow {
  id: string;
  name: string;
  client: string;
  currentStage: string;
  status: string;
  briefDeck: { version: number; pptxUrl: string | null } | null;
}

export default function BulkExportPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Reuse the workflow-campaigns list endpoint and join briefDeck info
      // through the campaign detail (light enough at MVP scale; can paginate
      // later if needed).
      const res = await fetch("/api/workflow-campaigns");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = (await res.json()) as Array<{
        id: string; name: string; client: string; currentStage: string; status: string;
      }>;
      const detailed = await Promise.all(
        list.map(async (c) => {
          const r = await fetch(`/api/workflow-campaigns/${c.id}`);
          if (!r.ok) return null;
          const d = (await r.json()) as { briefDeck: { version: number; pptxUrl: string | null } | null };
          return { ...c, briefDeck: d.briefDeck };
        }),
      );
      setCampaigns(detailed.filter((c): c is CampaignRow => c !== null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectWithBriefs() {
    const next = new Set<string>();
    for (const c of campaigns) if (c.briefDeck) next.add(c.id);
    setSelected(next);
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function doExport() {
    if (selected.size === 0) return;
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow-campaigns/export-briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `briefs-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const eligibleCount = useMemo(() => campaigns.filter((c) => c.briefDeck).length, [campaigns]);
  const selectedWithBrief = useMemo(
    () => Array.from(selected).filter((id) => campaigns.find((c) => c.id === id)?.briefDeck).length,
    [selected, campaigns],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Package className="h-5 w-5" />
        <div>
          <h1 className="font-semibold">Bulk Brief Export</h1>
          <p className="text-xs text-muted-foreground">
            Download multiple brief decks as a single ZIP. Selected: {selected.size} ({selectedWithBrief} with briefs)
          </p>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={selectWithBriefs} disabled={loading || eligibleCount === 0}>
          Select all with briefs ({eligibleCount})
        </Button>
        <Button size="sm" variant="ghost" onClick={clearSelection} disabled={selected.size === 0}>
          Clear
        </Button>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button size="sm" onClick={doExport} disabled={exporting || selectedWithBrief === 0}>
          <Download className="h-3.5 w-3.5" />
          Download .zip
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && <p className="text-sm text-muted-foreground">Loading campaigns…</p>}
        {!loading && campaigns.length === 0 && (
          <p className="text-sm text-muted-foreground">No campaigns to export.</p>
        )}

        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="py-2 px-3 w-10"></th>
                <th className="text-left py-2 px-3">Campaign</th>
                <th className="text-left py-2 px-3">Client</th>
                <th className="text-left py-2 px-3">Stage</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Brief</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const isSelected = selected.has(c.id);
                const hasBrief = !!c.briefDeck;
                return (
                  <tr key={c.id} className={`border-b last:border-0 hover:bg-accent/20 ${isSelected ? "bg-accent/30" : ""}`}>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(c.id)}
                        disabled={!hasBrief}
                        title={hasBrief ? undefined : "No brief deck — generate one first"}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Link href={`/workflow/${c.id}`} className="hover:underline">{c.name}</Link>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{c.client}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-[10px]">{c.currentStage}</Badge>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">
                      {hasBrief ? `v${c.briefDeck!.version}` : <span className="opacity-50">none</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
