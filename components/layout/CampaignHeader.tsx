"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, Copy, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/contexts/SettingsContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CampaignHeaderProps {
  id: string;
  campaignName: string | null;
  status: string;
  miroUrl: string | null;
  lastSaved: Date | null;
  isDirty: boolean;
  onSave: () => Promise<void>;
  onNameChange: (name: string) => void;
  onStatusChange: (status: string) => void;
}

export function CampaignHeader({
  id, campaignName, status, miroUrl, lastSaved, isDirty,
  onSave, onNameChange, onStatusChange,
}: CampaignHeaderProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(campaignName ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameValue(campaignName ?? "");
  }, [campaignName]);

  useEffect(() => {
    if (editingName) nameRef.current?.select();
  }, [editingName]);

  async function handleSave() {
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  async function handleDelete() {
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    router.push("/campaigns");
    router.refresh();
  }

  async function handleDuplicate() {
    const res = await fetch(`/api/campaigns/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const copy = await res.json();
      router.push(`/campaigns/${copy.id}`);
    }
  }

  function commitName() {
    setEditingName(false);
    onNameChange(nameValue);
  }

  const statusOptions = settings.dropdown_status;
  const statusColor = statusOptions.find((s) => s.value === status)?.color;

  return (
    <header className="sticky top-0 z-30 bg-background border-b px-6 py-3 flex items-center gap-4">
      {/* Inline-editable campaign name */}
      <div className="flex-1 min-w-0">
        {editingName ? (
          <input
            ref={nameRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameValue(campaignName ?? ""); setEditingName(false); } }}
            className="text-xl font-bold bg-transparent border-b-2 border-primary outline-none w-full"
          />
        ) : (
          <h1
            className={cn("text-xl font-bold cursor-text truncate hover:opacity-70 transition-opacity", !campaignName && "text-muted-foreground italic")}
            onClick={() => setEditingName(true)}
            title="Click to edit"
          >
            {campaignName || "Untitled Campaign"}
          </h1>
        )}
      </div>

      {/* Status */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[130px] h-8 text-sm">
          <SelectValue>
            <StatusBadge status={status} color={statusColor} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              <StatusBadge status={s.value} color={s.color} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Save indicator */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="h-3 w-3" />
        {isDirty ? (
          <span className="text-amber-600 dark:text-amber-400 font-medium">Unsaved changes</span>
        ) : lastSaved ? (
          <span>Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {miroUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={miroUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open Miro Board
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleDuplicate}>
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} className="text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete campaign?"
        description={`This will permanently delete "${campaignName || "Untitled Campaign"}" and all its data. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </header>
  );
}
