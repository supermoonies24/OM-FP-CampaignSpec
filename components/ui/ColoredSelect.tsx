"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { getValueColor } from "@/lib/valueColors";

interface ColoredSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  options: string[];
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
        {options.map((v) => (
          <SelectItem key={v} value={v}>
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getValueColor(v) }}
              />
              {v}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ValueChip({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getValueColor(value) }} />
      {value}
    </span>
  );
}
