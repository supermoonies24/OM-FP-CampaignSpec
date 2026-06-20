"use client";

import { STAGES, STAGE_CONFIG, isValidStage, type Stage } from "@/lib/workflow/stages";
import { cn } from "@/lib/utils";

interface StageProgressProps {
  currentStage: string;
  completedStages?: Set<string>;
}

export function StageProgress({ currentStage, completedStages }: StageProgressProps) {
  const currentIdx = isValidStage(currentStage) ? STAGES.indexOf(currentStage as Stage) : -1;
  return (
    <div className="space-y-1">
      <div className="flex gap-0.5 w-full">
        {STAGES.map((stage, idx) => {
          const isCompleted = completedStages ? completedStages.has(stage) : idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div
              key={stage}
              className={cn(
                "h-1.5 flex-1 rounded-sm transition-colors",
                isCurrent
                  ? "bg-foreground"
                  : isCompleted
                    ? "bg-foreground/50"
                    : "bg-muted",
              )}
              title={STAGE_CONFIG[stage].label}
            />
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Stage {currentIdx + 1} of {STAGES.length}
      </p>
    </div>
  );
}
