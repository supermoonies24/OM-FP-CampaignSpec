"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Send, Bell, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CampaignTabs } from "@/components/workflow/CampaignTabs";
import { cn } from "@/lib/utils";

interface Comment { id: string; source: string; authorEmail: string; body: string; createdAt: string }
interface Notification { id: string; kind: string; channel: string; recipients: string; payload: string; sentAt: string | null; createdAt: string }

interface WorkflowCampaignDetail {
  id: string; name: string; client: string;
  comments: Comment[];
  notifications: Notification[];
}

type Filter = "all" | "notifications" | "comments";

export default function WorkflowCommsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<WorkflowCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

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

  useEffect(() => { load(); }, [load]);

  const entries = useMemo(() => {
    if (!campaign) return [] as { at: string; kind: "comment" | "notification"; data: Comment | Notification }[];
    const items: { at: string; kind: "comment" | "notification"; data: Comment | Notification }[] = [];
    if (filter !== "comments") {
      for (const n of campaign.notifications) items.push({ at: n.createdAt, kind: "notification", data: n });
    }
    if (filter !== "notifications") {
      for (const c of campaign.comments) items.push({ at: c.createdAt, kind: "comment", data: c });
    }
    return items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [campaign, filter]);

  if (loading && !campaign) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error && !campaign) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!campaign) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href={`/workflow/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold truncate">{campaign.name}</h1>
          <p className="text-xs text-muted-foreground truncate">Comms</p>
        </div>
        <div className="flex-1" />
        <CampaignTabs campaignId={campaign.id} active="comms" />
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        <CommentComposer campaignId={campaign.id} onPosted={load} />

        <div className="flex items-center gap-1 border-b">
          {(["all", "notifications", "comments"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 text-sm capitalize border-b-2 -mb-px",
                filter === f
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <ol className="space-y-2">
          {entries.length === 0 && (
            <li className="text-sm text-muted-foreground italic py-6 text-center">
              {filter === "comments" ? "No comments yet." : filter === "notifications" ? "No notifications." : "No comms activity yet."}
            </li>
          )}
          {entries.map((e, i) => (
            <li key={i} className="rounded-md border bg-card px-4 py-3">
              {e.kind === "notification" ? (
                <NotificationRow notification={e.data as Notification} />
              ) : (
                <CommentRow comment={e.data as Comment} />
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function NotificationRow({ notification: n }: { notification: Notification }) {
  const payload = useMemo(() => {
    try { return JSON.parse(n.payload) as Record<string, unknown>; } catch { return null; }
  }, [n.payload]);
  const recipients = useMemo(() => {
    try { return JSON.parse(n.recipients) as string[]; } catch { return [] as string[]; }
  }, [n.recipients]);

  const stageLabel = payload?.stageLabel as string | undefined;
  const notes = payload?.notes as string | undefined;

  return (
    <div className="flex items-start gap-3 text-sm">
      <Bell className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{n.kind}</Badge>
          <Badge variant="outline" className="text-[10px]">via {n.channel}</Badge>
          {n.sentAt ? (
            <Badge variant="default" className="text-[10px]">sent</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">unsent</Badge>
          )}
          {stageLabel && <span className="text-xs text-muted-foreground">· stage {stageLabel}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          To: {recipients.join(", ")}
          {notes && <span> — {notes}</span>}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(n.createdAt), "MMM d · h:mm a")}</p>
      </div>
    </div>
  );
}

function CommentRow({ comment: c }: { comment: Comment }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{c.source}</Badge>
          <span className="font-medium">{c.authorEmail}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(c.createdAt), "MMM d · h:mm a")}</p>
      </div>
    </div>
  );
}

function CommentComposer({ campaignId, onPosted }: { campaignId: string; onPosted: () => void }) {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${campaignId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorEmail: author.trim(), body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setBody("");
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4 space-y-3">
      <div className="grid grid-cols-[200px_1fr] gap-3">
        <Input
          placeholder="your.name@email"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          disabled={busy}
        />
        <Textarea
          placeholder="Write a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
          rows={2}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={busy || !author.trim() || !body.trim()}>
          <Send className="h-3.5 w-3.5" />
          Post
        </Button>
      </div>
    </form>
  );
}
