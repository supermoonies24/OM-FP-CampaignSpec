"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, AtSign, Bell, CheckCheck, Inbox, RefreshCw, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InboxItem {
  id: string;
  campaignId: string;
  campaign: { id: string; name: string; currentStage: string; client: string } | null;
  kind: string;
  payload: Record<string, unknown> | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

function kindIcon(kind: string) {
  switch (kind) {
    case "atRiskAlert":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "approvalRequested":
      return <CheckCheck className="h-4 w-4 text-emerald-500" />;
    case "calendarInvite":
    case "meetingScheduled":
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case "aiBriefGenerate":
      return <Sparkles className="h-4 w-4 text-violet-500" />;
    case "mention":
      return <AtSign className="h-4 w-4 text-pink-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function summarize(item: InboxItem): string {
  const p = item.payload ?? {};
  const stageLabel = (p.stageLabel as string | undefined) ?? (p.stage as string | undefined) ?? "";
  switch (item.kind) {
    case "atRiskAlert": {
      const severity = p.severity as string | undefined;
      const reason = p.riskReason as string | undefined;
      const score = typeof p.riskScore === "number" ? ` (${(p.riskScore * 100).toFixed(0)}%)` : "";
      return `${stageLabel} is ${severity ?? "at risk"}${score}${reason ? ` — ${reason}` : ""}`;
    }
    case "approvalRequested": {
      const owner = p.ownerChannel as string | undefined;
      return `${stageLabel} needs ${owner ?? ""} approval`;
    }
    case "mention": {
      const author = p.authorEmail as string | undefined;
      const preview = p.preview as string | undefined;
      return `${author ?? "Someone"} mentioned ${p.all ? "@here" : `@${p.mentionedChannel}`}${preview ? `: ${preview}` : ""}`;
    }
    case "calendarInvite":
      return `${stageLabel} meeting needs scheduling${p.notes ? ` (${p.notes})` : ""}`;
    case "aiBriefGenerate":
      return `${stageLabel} entered — AI brief generation queued`;
    case "ensureSpecForm":
      return `${stageLabel} entered — spec form attached`;
    case "notify":
      return `${stageLabel}${p.notes ? ` — ${p.notes}` : ""}`;
    default:
      return `${stageLabel}`.trim() || item.kind;
  }
}

// Deep-link target for an inbox item — risk alerts go to the timeline page,
// brief-related kinds go to /brief, everything else to the overview.
function deepLink(item: InboxItem): string {
  switch (item.kind) {
    case "atRiskAlert":
      return `/workflow/${item.campaignId}/timeline`;
    case "aiBriefGenerate":
      return `/workflow/${item.campaignId}/brief`;
    case "calendarInvite":
      return `/workflow/${item.campaignId}/comms`;
    case "approvalRequested":
      return `/workflow/${item.campaignId}`;
    case "mention":
      return `/workflow/${item.campaignId}/comms`;
    default:
      return `/workflow/${item.campaignId}`;
  }
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notifications?limit=100${filter === "unread" ? "&unread=1" : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await fetch(`/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, InboxItem[]>();
    for (const it of items) {
      const key = it.campaign?.name ?? "(unknown campaign)";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const unreadCount = items.filter((i) => !i.readAt).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Inbox className="h-5 w-5" />
        <div>
          <h1 className="font-semibold">Inbox</h1>
          <p className="text-xs text-muted-foreground">In-app notifications across all campaigns</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center rounded-md border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`px-2.5 py-1 rounded ${filter === "unread" ? "bg-accent" : "text-muted-foreground"}`}
          >
            Unread{filter === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded ${filter === "all" ? "bg-accent" : "text-muted-foreground"}`}
          >
            All
          </button>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={busy}>
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        </Button>
        <Button size="sm" variant="outline" onClick={markAllRead} disabled={busy || unreadCount === 0}>
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && items.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
            {filter === "unread" ? "No unread notifications." : "Inbox empty."}
          </div>
        )}

        {grouped.map(([name, group]) => (
          <section key={name} className="rounded-lg border bg-card">
            <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
              <h3 className="font-semibold text-sm">{name}</h3>
              {group[0]?.campaign && (
                <Link
                  href={`/workflow/${group[0].campaign.id}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  open →
                </Link>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{group.length}</span>
            </div>
            <ul className="divide-y">
              {group.map((item) => (
                <li
                  key={item.id}
                  className={`px-4 py-3 flex gap-3 items-start ${item.readAt ? "opacity-60" : ""}`}
                >
                  <div className="shrink-0 mt-0.5">{kindIcon(item.kind)}</div>
                  <Link
                    href={deepLink(item)}
                    onClick={() => { if (!item.readAt) markRead(item.id); }}
                    className="flex-1 min-w-0 hover:opacity-80"
                  >
                    <p className="text-sm">{summarize(item)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{item.kind}</Badge>
                      <span>{format(new Date(item.createdAt), "PPp")}</span>
                    </p>
                  </Link>
                  {!item.readAt && (
                    <Button size="sm" variant="ghost" onClick={() => markRead(item.id)} disabled={busy}>
                      <CheckCheck className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
