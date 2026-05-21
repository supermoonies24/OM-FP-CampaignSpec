"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DropdownEditorProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}

export function DropdownEditor({ label, values, onChange }: DropdownEditorProps) {
  const [newValue, setNewValue] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function addValue() {
    const trimmed = newValue.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setNewValue("");
  }

  function removeValue(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function handleDragStart(idx: number) { setDragging(idx); }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOver(idx);
  }
  function handleDrop(idx: number) {
    if (dragging === null || dragging === idx) { setDragging(null); setDragOver(null); return; }
    const arr = [...values];
    const [item] = arr.splice(dragging, 1);
    arr.splice(idx, 0, item);
    onChange(arr);
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="space-y-1.5 max-h-72 overflow-y-auto border rounded-md p-2">
        {values.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No values — add one below.</p>
        )}
        {values.map((v, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={() => { setDragging(null); setDragOver(null); }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${dragOver === idx ? "bg-accent" : "hover:bg-muted/50"} transition-colors`}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab shrink-0" />
            <span className="flex-1 truncate">{v}</span>
            <button
              type="button"
              onClick={() => removeValue(idx)}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add new value…"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addValue(); }}
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8 shrink-0" onClick={addValue} disabled={!newValue.trim()}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
