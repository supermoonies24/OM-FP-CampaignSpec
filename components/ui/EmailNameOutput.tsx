"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailNameOutputProps {
  value: string | null | undefined;
  placeholder?: string;
  label?: string;
}

export function EmailNameOutput({ value, placeholder, label }: EmailNameOutputProps) {
  const [copied, setCopied] = useState(false);

  const isEmpty = !value;
  const isPlaceholder = value === null; // null = "use orchestration" message

  const displayText = isPlaceholder
    ? placeholder ?? "Please use the Orchestration section below"
    : (value || "—");

  async function handleCopy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1">
      {label && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>}
      <div className="relative flex items-center">
        <div
          className={cn(
            "flex-1 rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm min-h-[36px]",
            (isEmpty || isPlaceholder) && "text-muted-foreground italic"
          )}
        >
          {displayText}
        </div>
        {!isEmpty && !isPlaceholder && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
