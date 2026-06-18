"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { COLOR_PALETTE, getValueColor } from "@/lib/valueColors";
import type { DropdownValue } from "@/contexts/SettingsContext";

interface DropdownEditorProps {
  label: string;
  values: DropdownValue[];
  onChange: (values: DropdownValue[]) => void;
}

function ColorSwatchPicker({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-4 h-4 rounded-full shrink-0 ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: color }}
          title="Change color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-8 gap-1.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className="w-5 h-5 rounded-full ring-1 ring-inset ring-black/10 hover:scale-110 transition-transform"
              style={{ backgroundColor: c, outline: c === color ? "2px solid currentColor" : undefined }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DropdownEditor({ label, values, onChange }: DropdownEditorProps) {
  const [newValue, setNewValue] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function addValue() {
    const trimmed = newValue.trim();
    if (!trimmed || values.some((v) => v.value === trimmed)) return;
    onChange([...values, { value: trimmed, color: getValueColor(trimmed) }]);
    setNewValue("");
  }

  function removeValue(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function renameValue(idx: number, text: string) {
    onChange(values.map((v, i) => (i === idx ? { ...v, value: text } : v)));
  }

  function recolorValue(idx: number, color: string) {
    onChange(values.map((v, i) => (i === idx ? { ...v, color } : v)));
  }

  function setDefaultValue(idx: number) {
    onChange(values.map((v, i) => ({ ...v, isDefault: i === idx ? !v.isDefault : false })));
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
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">Click the star to set a value as the pre-filled default.</p>
      </div>
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
            <ColorSwatchPicker color={v.color} onChange={(color) => recolorValue(idx, color)} />
            <input
              value={v.value}
              onChange={(e) => renameValue(idx, e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none rounded px-1 -mx-1 focus:bg-background focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setDefaultValue(idx)}
              title={v.isDefault ? "Default value — click to unset" : "Set as default value"}
              className={`transition-colors shrink-0 ${v.isDefault ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`}
            >
              <Star className="h-3.5 w-3.5" fill={v.isDefault ? "currentColor" : "none"} />
            </button>
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
