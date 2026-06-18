"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { getValueColor } from "@/lib/valueColors";
import type { DropdownValue } from "@/contexts/SettingsContext";

interface ColoredSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  options: DropdownValue[];
  placeholder?: string;
  className?: string;
}

export function ColoredSelect({
  value, onValueChange, options, placeholder = "Select…", className,
}: ColoredSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: opt.color }}
              />
              {opt.value}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ValueChip({ value, color }: { value: string; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color ?? getValueColor(value) }} />
      {value}
    </span>
  );
}
