"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function IntakePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    client: "Ford Pro",
    submittedBy: "",
    summary: "",
    objective: "",
    audience: "",
    targetLaunchDate: "",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          client: form.client,
          submittedBy: form.submittedBy,
          rawForm: {
            summary: form.summary,
            objective: form.objective,
            audience: form.audience,
            targetLaunchDate: form.targetLaunchDate,
            notes: form.notes,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const campaign = await res.json();
      router.push(`/workflow/${campaign.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  }

  const canSubmit = form.name.trim() && form.submittedBy.trim() && form.summary.trim();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b bg-background px-6 py-4 flex items-center gap-4">
        <Link href="/workflow" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-semibold">New Campaign Intake</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <p className="text-sm text-muted-foreground">
          Submit a new campaign for the team. On submit, the campaign enters the <strong>Intake</strong> stage
          and will appear on the workflow board. OM Alignment is the next stage.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Q3 Super Duty refresh" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client">Client</Label>
            <Input id="client" value={form.client} onChange={(e) => update("client", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="submittedBy">Your name *</Label>
            <Input id="submittedBy" required value={form.submittedBy} onChange={(e) => update("submittedBy", e.target.value)} placeholder="Strategy team member" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="summary">Campaign summary *</Label>
          <Textarea id="summary" required rows={3} value={form.summary} onChange={(e) => update("summary", e.target.value)} placeholder="One paragraph: what is this campaign, who is it for, why now?" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="objective">Primary objective</Label>
            <Input id="objective" value={form.objective} onChange={(e) => update("objective", e.target.value)} placeholder="e.g. Drive test drives" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audience">Audience</Label>
            <Input id="audience" value={form.audience} onChange={(e) => update("audience", e.target.value)} placeholder="e.g. Existing Super Duty owners" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="targetLaunchDate">Target launch date</Label>
          <Input id="targetLaunchDate" type="date" value={form.targetLaunchDate} onChange={(e) => update("targetLaunchDate", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Additional notes</Label>
          <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Anything else the team needs to know" />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link href="/workflow">
            <Button type="button" variant="outline" disabled={submitting}>Cancel</Button>
          </Link>
          <Button type="submit" disabled={!canSubmit || submitting}>
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Submitting…" : "Submit Intake"}
          </Button>
        </div>
      </form>
    </div>
  );
}
