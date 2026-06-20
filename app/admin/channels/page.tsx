"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHANNELS, CHANNEL_LABELS, type Channel } from "@/lib/workflow/channels";
import { cn } from "@/lib/utils";

interface AssignmentWithCampaign {
  id: string;
  channel: string;
  userId: string;
  role: string;
  campaign: { id: string; name: string; client: string; currentStage: string };
}

type Grouping = "channel" | "user";

export default function AdminChannelsPage() {
  const [assignments, setAssignments] = useState<AssignmentWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grouping, setGrouping] = useState<Grouping>("channel");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/channels");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAssignments(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const byChannel = useMemo(() => {
    const map = new Map<Channel, AssignmentWithCampaign[]>();
    for (const ch of CHANNELS) map.set(ch, []);
    for (const a of assignments) {
      if ((CHANNELS as readonly string[]).includes(a.channel)) {
        map.get(a.channel as Channel)!.push(a);
      }
    }
    return map;
  }, [assignments]);

  const byUser = useMemo(() => {
    const map = new Map<string, AssignmentWithCampaign[]>();
    for (const a of assignments) {
      if (!map.has(a.userId)) map.set(a.userId, []);
      map.get(a.userId)!.push(a);
    }
    return new Map([...map.entries()].sort());
  }, [assignments]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-semibold">Channel Assignments</h1>
          <p className="text-xs text-muted-foreground">{assignments.length} across {byUser.size} {byUser.size === 1 ? "person" : "people"}</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => setGrouping("channel")}
            className={cn("px-2.5 py-1.5 text-xs rounded", grouping === "channel" ? "bg-accent" : "text-muted-foreground hover:text-foreground")}
          >
            By Channel
          </button>
          <button
            type="button"
            onClick={() => setGrouping("user")}
            className={cn("px-2.5 py-1.5 text-xs rounded", grouping === "user" ? "bg-accent" : "text-muted-foreground hover:text-foreground")}
          >
            By Person
          </button>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-sm text-muted-foreground">
          Channel membership is managed per-campaign on each campaign overview. This page is a global read-only roll-up so you can see who is on what at a glance.
        </p>

        {grouping === "channel" && (
          <div className="space-y-3">
            {CHANNELS.map((ch) => {
              const items = byChannel.get(ch) ?? [];
              return (
                <section key={ch} className="rounded-lg border bg-card">
                  <header className="flex items-center gap-2 px-4 py-3 border-b">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold">{CHANNEL_LABELS[ch]}</h2>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </header>
                  {items.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground italic">No one assigned.</p>
                  ) : (
                    <ul className="divide-y">
                      {items.map((a) => (
                        <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                          <span className="flex-1">{a.userId}</span>
                          <Badge variant="outline" className="text-[10px]">{a.role}</Badge>
                          <Link href={`/workflow/${a.campaign.id}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                            {a.campaign.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {grouping === "user" && (
          <div className="space-y-3">
            {byUser.size === 0 ? (
              <p className="text-sm text-muted-foreground italic">No assignments yet.</p>
            ) : (
              [...byUser.entries()].map(([userId, items]) => (
                <section key={userId} className="rounded-lg border bg-card">
                  <header className="flex items-center gap-2 px-4 py-3 border-b">
                    <h2 className="font-semibold text-sm">{userId}</h2>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </header>
                  <ul className="divide-y">
                    {items.map((a) => (
                      <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                        <Badge variant="secondary" className="text-[10px]">{CHANNEL_LABELS[a.channel as Channel] ?? a.channel}</Badge>
                        <Badge variant="outline" className="text-[10px]">{a.role}</Badge>
                        <Link href={`/workflow/${a.campaign.id}`} className="flex-1 text-sm hover:underline truncate">
                          {a.campaign.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{a.campaign.client}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
