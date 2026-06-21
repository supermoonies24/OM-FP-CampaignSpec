"use client";

import { Fragment, use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Send, FileText, ExternalLink, Users, X, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CampaignTabs } from "@/components/workflow/CampaignTabs";
import { StageProgress } from "@/components/workflow/StageProgress";
import { CHANNELS, CHANNEL_LABELS, type Channel } from "@/lib/workflow/channels";
import { STAGE_CONFIG, STAGES, getNextStage, isValidStage, type Stage } from "@/lib/workflow/stages";

interface StageTransition { id: string; fromStage: string | null; toStage: string; triggeredBy: string; notes: string | null; createdAt: string }
interface Approval { id: string; stage: string; channel: string; approvedBy: string; approvedAt: string; notes: string | null }
interface Comment { id: string; source: string; authorEmail: string; body: string; createdAt: string }
interface Intake { id: string; submittedBy: string; rawForm: string; createdAt: string }
interface Assignment { id: string; channel: string; userId: string; role: string }
interface BriefDeckSummary { id: string; specFormDraft: string; version: number; generatedBy: string }

interface WorkflowCampaignDetail {
  id: string;
  name: string;
  client: string;
  currentStage: string;
  status: string;
  figmaUrl: string | null;
  specFormId: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  intake: Intake | null;
  briefDeck: BriefDeckSummary | null;
  assignments: Assignment[];
  stageHistory: StageTransition[];
  approvals: Approval[];
  comments: Comment[];
}

export default function WorkflowCampaignPage({ params }: { params: Promise<{ id: string }> }) {
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
      if (res.status === 404) throw new Error("Campaign not found");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCampaign(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function transition(to: string, notes?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transition failed");
    } finally {
      setBusy(false);
    }
  }

  const [advanceNotes, setAdvanceNotes] = useState("");
  function advance() {
    if (!campaign || !isValidStage(campaign.currentStage)) return;
    const next = getNextStage(campaign.currentStage as Stage);
    if (next) {
      transition(next, advanceNotes.trim() || undefined);
      setAdvanceNotes("");
    }
  }

  async function signOff(channel: Channel) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${id}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error && !campaign) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!campaign) return null;

  const stage = isValidStage(campaign.currentStage) ? (campaign.currentStage as Stage) : null;
  const config = stage ? STAGE_CONFIG[stage] : null;
  const next = stage ? getNextStage(stage) : null;
  const isSignoffGate = config?.gate === "signoff";
  const ownerApproved = isSignoffGate
    ? campaign.approvals.some((a) => a.stage === campaign.currentStage && a.channel === config!.ownerChannel)
    : true;
  const canAdvance = !!next && (!isSignoffGate || ownerApproved);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold truncate flex items-center gap-2">
            {campaign.name}
            <CampaignStatusBadge status={campaign.status} />
          </h1>
          <p className="text-xs text-muted-foreground truncate">{campaign.client}</p>
        </div>
        <div className="flex-1" />
        <CampaignTabs campaignId={campaign.id} active="overview" />
        <DuplicateButton campaignId={campaign.id} />
        <Button size="sm" variant="ghost" onClick={load} disabled={busy}>
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <StageProgress
          currentStage={campaign.currentStage}
          completedStages={new Set(campaign.stageHistory.filter((t) => t.toStage !== campaign.currentStage).map((t) => t.toStage))}
        />

        {/* Current stage card */}
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current stage</p>
              <h2 className="text-xl font-semibold mt-0.5">{config?.label ?? campaign.currentStage}</h2>
              {config && (
                <p className="text-xs text-muted-foreground mt-1">
                  Owner: <strong>{CHANNEL_LABELS[config.ownerChannel]}</strong> · Gate: {config.gate} · SLA: {config.slaDays}d
                  {config.participants.length > 1 && (
                    <> · Participants: {config.participants.map((c) => CHANNEL_LABELS[c]).join(", ")}</>
                  )}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Stage {stage ? STAGES.indexOf(stage) + 1 : "?"} of {STAGES.length}
              </p>
            </div>
          </div>

          {isSignoffGate && config && (
            <div className={`rounded-md border p-3 text-sm ${ownerApproved ? "border-green-500/40 bg-green-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
              {ownerApproved ? (
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {CHANNEL_LABELS[config.ownerChannel]} has signed off — ready to advance.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Requires signoff from <strong>{CHANNEL_LABELS[config.ownerChannel]}</strong> to advance.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map((ch) => (
                      <Button
                        key={ch}
                        size="sm"
                        variant={ch === config.ownerChannel ? "default" : "outline"}
                        onClick={() => signOff(ch)}
                        disabled={busy}
                      >
                        Sign off as {CHANNEL_LABELS[ch]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <KickBackPicker
              currentStage={stage}
              disabled={busy}
              onKickBack={(target, notes) => transition(target, notes)}
            />
            {next && (
              <div className="flex flex-wrap items-end gap-3 ml-auto">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
                  <Input
                    value={advanceNotes}
                    onChange={(e) => setAdvanceNotes(e.target.value)}
                    placeholder="e.g. approved on Slack thread"
                    disabled={busy}
                    className="h-9 w-56"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Next: <strong>{STAGE_CONFIG[next].label}</strong>
                  </p>
                  <Button onClick={advance} disabled={!canAdvance || busy}>
                    Advance
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            {!next && (
              <p className="text-sm text-muted-foreground ml-auto">This is the terminal stage.</p>
            )}
          </div>
        </section>

        {/* Team */}
        <TeamPanel campaign={campaign} onChange={load} />

        {/* Spec Form linking */}
        <SpecFormPanel campaign={campaign} onChange={load} />

        {/* Status control */}
        <StatusPanel campaign={campaign} onChange={load} />

        {/* Tags */}
        <TagsPanel campaign={campaign} onChange={load} />

        {/* Intake details */}
        {campaign.intake && <IntakePanel intake={campaign.intake} />}

        {/* AI-suggested intake clarifications when intake is sparse. */}
        {campaign.intake && <IntakeClarificationsPanel campaignId={campaign.id} />}

        <CommentComposer campaignId={campaign.id} onPosted={load} />

        {/* Activity log */}
        <ActivityLog
          transitions={campaign.stageHistory}
          approvals={campaign.approvals}
          comments={campaign.comments}
        />
      </div>
    </div>
  );
}

const STATUS_OPTIONS = ["active", "onHold", "cancelled", "shipped"] as const;
const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  onHold: "On Hold",
  cancelled: "Cancelled",
  shipped: "Shipped",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  onHold: "outline",
  cancelled: "destructive",
  shipped: "secondary",
};

function CampaignStatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>{STATUS_LABELS[status] ?? status}</Badge>;
}

function StatusPanel({ campaign, onChange }: { campaign: WorkflowCampaignDetail; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: string) {
    if (status === campaign.status) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Status</h3>
        <CampaignStatusBadge status={campaign.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === campaign.status ? "default" : "outline"}
            disabled={busy || s === campaign.status}
            onClick={() => setStatus(s)}
          >
            {STATUS_LABELS[s]}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

function KickBackPicker({
  currentStage,
  disabled,
  onKickBack,
}: {
  currentStage: Stage | null;
  disabled: boolean;
  onKickBack: (target: string, notes: string) => void;
}) {
  const [target, setTarget] = useState("");
  const [notes, setNotes] = useState("");
  const earlier = useMemo(() => {
    if (!currentStage) return [] as Stage[];
    const idx = STAGES.indexOf(currentStage);
    return STAGES.slice(0, idx);
  }, [currentStage]);

  if (earlier.length === 0) return <div />;

  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Kick back to</label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          disabled={disabled}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">— stage —</option>
          {earlier.map((s) => (
            <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
          ))}
        </select>
      </div>
      <Input
        placeholder="Reason (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={disabled}
        className="h-9 w-56"
      />
      <Button
        variant="outline"
        disabled={disabled || !target}
        onClick={() => {
          if (target) {
            onKickBack(target, notes);
            setTarget("");
            setNotes("");
          }
        }}
      >
        <Undo2 className="h-3.5 w-3.5" />
        Send back
      </Button>
    </div>
  );
}

function TeamPanel({ campaign, onChange }: { campaign: WorkflowCampaignDetail; onChange: () => void }) {
  const [channel, setChannel] = useState<Channel>(CHANNELS[2]); // STRATEGY default
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("contributor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of campaign.assignments) {
      if (!map.has(a.channel)) map.set(a.channel, []);
      map.get(a.channel)!.push(a);
    }
    return map;
  }, [campaign.assignments]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${campaign.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, userId: userId.trim(), role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setUserId("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add assignment");
    } finally {
      setBusy(false);
    }
  }

  async function remove(assignmentId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflow-campaigns/${campaign.id}/assignments/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Team</h3>
        <span className="text-xs text-muted-foreground">({campaign.assignments.length})</span>
      </div>

      {campaign.assignments.length > 0 && (
        <div className="space-y-3">
          {CHANNELS.map((ch) => {
            const items = grouped.get(ch) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={ch}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{CHANNEL_LABELS[ch]}</p>
                <ul className="mt-1 space-y-1">
                  {items.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">{a.userId}</span>
                      <Badge variant="outline" className="text-[10px]">{a.role}</Badge>
                      <button
                        type="button"
                        onClick={() => remove(a.id)}
                        disabled={busy}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={add} className="flex flex-wrap items-end gap-2 pt-2 border-t">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-muted-foreground mb-1">Email / user id</label>
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="name@example.com" disabled={busy} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            disabled={busy}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={busy}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="owner">owner</option>
            <option value="contributor">contributor</option>
            <option value="reviewer">reviewer</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={busy || !userId.trim()}>Add</Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

function SpecFormPanel({ campaign, onChange }: { campaign: WorkflowCampaignDetail; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attach() {
    setBusy(true);
    setError(null);
    try {
      // Seed the spec form with values from the generated brief if it exists.
      // Falls back to just the campaign name otherwise.
      let seed: Record<string, unknown> = { campaignName: campaign.name };
      if (campaign.briefDeck) {
        try {
          const draft = JSON.parse(campaign.briefDeck.specFormDraft) as Record<string, unknown>;
          seed = { ...seed, ...draft };
        } catch {
          // ignore malformed draft; fall through with name only
        }
      }
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seed),
      });
      if (!createRes.ok) throw new Error(`Create spec form failed: HTTP ${createRes.status}`);
      const specForm = await createRes.json();

      const patchRes = await fetch(`/api/workflow-campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specFormId: specForm.id }),
      });
      if (!patchRes.ok) throw new Error(`Link spec form failed: HTTP ${patchRes.status}`);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to attach spec form");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Spec Form</h3>
        </div>
        {campaign.specFormId ? (
          <Link href={`/campaigns/${campaign.specFormId}`} className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
            Open spec form
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <Button size="sm" variant="outline" onClick={attach} disabled={busy}>
            {busy ? "Attaching…" : "Attach new spec form"}
          </Button>
        )}
      </div>
      {campaign.specFormId ? (
        <p className="text-xs text-muted-foreground">Linked: {campaign.specFormId}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {campaign.briefDeck
            ? `Will pre-fill from brief v${campaign.briefDeck.version}.`
            : "Attaching now creates a blank spec form. Generate a brief first to pre-fill it."}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

function IntakePanel({ intake }: { intake: Intake }) {
  const fields = useMemo(() => {
    try {
      const parsed = JSON.parse(intake.rawForm) as Record<string, unknown>;
      return Object.entries(parsed).filter(([, v]) => v !== "" && v != null);
    } catch {
      return [] as [string, unknown][];
    }
  }, [intake.rawForm]);

  return (
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Intake</h3>
        <p className="text-xs text-muted-foreground">
          Submitted by {intake.submittedBy} · {format(new Date(intake.createdAt), "PP p")}
        </p>
      </div>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fields recorded.</p>
      ) : (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
          {fields.map(([k, v]) => (
            <Fragment key={k}>
              <dt className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</dt>
              <dd className="whitespace-pre-wrap">{String(v)}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </section>
  );
}

function TagsPanel({ campaign, onChange }: { campaign: WorkflowCampaignDetail; onChange: () => void }) {
  const initial = useMemo(() => {
    try { return JSON.parse(campaign.tags ?? "[]") as string[]; } catch { return []; }
  }, [campaign.tags]);
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setTags(initial); }, [initial]);

  async function persist(next: string[]) {
    setBusy(true);
    try {
      await fetch(`/api/workflow-campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  function add() {
    const t = draft.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setDraft("");
    persist(next);
  }

  function remove(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    persist(next);
  }

  return (
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <h3 className="font-semibold">Tags</h3>
      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.length === 0 && <p className="text-xs text-muted-foreground">No tags yet.</p>}
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="text-xs gap-1">
            {t}
            <button type="button" onClick={() => remove(t)} disabled={busy} className="hover:opacity-70">×</button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add a tag (e.g. Super Duty, Q3, fleet)…"
          className="text-sm h-8"
          maxLength={32}
        />
        <Button size="sm" variant="outline" onClick={add} disabled={busy || !draft.trim()}>Add</Button>
      </div>
    </section>
  );
}

function DuplicateButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm("Duplicate this campaign? It will start fresh at INTAKE with the same intake form.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/workflow-campaigns/${campaignId}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { id: string };
      router.push(`/workflow/${data.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="ghost" onClick={run} disabled={busy} title="Duplicate this campaign">
      <FileText className="h-3.5 w-3.5" />
      Duplicate
    </Button>
  );
}

function IntakeClarificationsPanel({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<{
    questions: { question: string; reason: string; field?: string }[];
    source: "ai" | "stub" | "skipped";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/workflow-campaigns/${campaignId}/clarify-intake`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setData(j); })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId]);

  // Don't render when the intake is comprehensive enough that the API skipped.
  if (loading) return null;
  if (!data || data.source === "skipped" || data.questions.length === 0) return null;

  return (
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Intake clarifications</h3>
        <Badge variant={data.source === "ai" ? "default" : "secondary"} className="text-[10px]">
          {data.source === "ai" ? "AI-suggested" : "Default checklist"}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {data.questions.length} question{data.questions.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        The intake form looks sparse. These follow-ups would most improve brief quality.
      </p>
      <ol className="space-y-2 text-sm list-decimal pl-5">
        {data.questions.map((q, i) => (
          <li key={i} className="space-y-0.5">
            <p>{q.question}</p>
            <p className="text-xs text-muted-foreground">
              {q.reason}
              {q.field && <> · fills <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{q.field}</code></>}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface ActivityLogProps {
  transitions: StageTransition[];
  approvals: Approval[];
  comments: Comment[];
}

function ActivityLog({ transitions, approvals, comments }: ActivityLogProps) {
  type Entry =
    | { kind: "transition"; at: string; data: StageTransition }
    | { kind: "approval"; at: string; data: Approval }
    | { kind: "comment"; at: string; data: Comment };

  const entries: Entry[] = [
    ...transitions.map((t) => ({ kind: "transition" as const, at: t.createdAt, data: t })),
    ...approvals.map((a) => ({ kind: "approval" as const, at: a.approvedAt, data: a })),
    ...comments.map((c) => ({ kind: "comment" as const, at: c.createdAt, data: c })),
  ].sort((a, b) => +new Date(a.at) - +new Date(b.at));

  return (
    <section className="rounded-lg border bg-card p-5">
      <h3 className="font-semibold mb-3">Activity</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="space-y-3 text-sm">
          {entries.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-xs text-muted-foreground tabular-nums w-32 shrink-0">
                {format(new Date(e.at), "MMM d · h:mm a")}
              </span>
              <div className="flex-1">
                {e.kind === "transition" && (
                  <span>
                    <Badge variant="secondary">transition</Badge>{" "}
                    {e.data.fromStage ? (
                      <>{stageLabel(e.data.fromStage)} → <strong>{stageLabel(e.data.toStage)}</strong></>
                    ) : (
                      <>Entered <strong>{stageLabel(e.data.toStage)}</strong></>
                    )}
                    <span className="text-muted-foreground"> by {e.data.triggeredBy}</span>
                    {e.data.notes && <span className="text-muted-foreground"> — {e.data.notes}</span>}
                  </span>
                )}
                {e.kind === "approval" && (
                  <span>
                    <Badge variant="secondary">approval</Badge>{" "}
                    <strong>{CHANNEL_LABELS[e.data.channel as Channel] ?? e.data.channel}</strong> signed off on{" "}
                    <strong>{stageLabel(e.data.stage)}</strong>
                    <span className="text-muted-foreground"> by {e.data.approvedBy}</span>
                  </span>
                )}
                {e.kind === "comment" && (
                  <span>
                    <Badge variant="secondary">{e.data.source}</Badge>{" "}
                    <strong>{e.data.authorEmail}</strong>: {e.data.body}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function stageLabel(stage: string): string {
  return isValidStage(stage) ? STAGE_CONFIG[stage].label : stage;
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
    <form onSubmit={submit} className="rounded-lg border bg-card p-5 space-y-3">
      <h3 className="font-semibold">Add comment</h3>
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
