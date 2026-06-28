"use client";

import { useState } from "react";
import { Check, Lock, Circle, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { STAGES, STAGE_CONFIG, isValidStage, type Stage } from "@/lib/workflow/stages";
import { CHANNEL_LABELS } from "@/lib/workflow/channels";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface TimelineItem {
  stage: string;
  targetDate: string;
  actualDate: string | null;
  enteredAt: string | null;
  status: string; // complete | onTrack | atRisk | late
  riskScore: number | null;
  riskReason: string | null;
}

interface Approval {
  stage: string;
  channel: string;
  approvedBy: string;
  approvedAt: string;
  notes: string | null;
}

interface StageTransition {
  fromStage: string | null;
  toStage: string;
  transitionedAt: string;
  notes: string | null;
}

interface StageRailProps {
  currentStage: string;
  timeline: TimelineItem[];
  approvals: Approval[];
  stageHistory: StageTransition[];
}

const RISK_COLOR: Record<string, string> = {
  complete: "text-muted-foreground",
  onTrack:  "text-emerald-500",
  atRisk:   "text-amber-500",
  late:     "text-destructive",
};

const RISK_LINE: Record<string, string> = {
  complete: "bg-muted-foreground/30",
  onTrack:  "bg-emerald-500/40",
  atRisk:   "bg-amber-500/40",
  late:     "bg-destructive/40",
};

function fmt(d: string) {
  return format(parseISO(d), "MMM d, yyyy");
}

export function StageRail({ currentStage, timeline, approvals, stageHistory }: StageRailProps) {
  const [expanded, setExpanded] = useState<string | null>(currentStage);

  const currentIdx = isValidStage(currentStage) ? STAGES.indexOf(currentStage as Stage) : -1;
  const timelineMap = Object.fromEntries(timeline.map((t) => [t.stage, t]));
  const approvalMap: Record<string, Approval[]> = {};
  for (const a of approvals) {
    approvalMap[a.stage] = approvalMap[a.stage] ?? [];
    approvalMap[a.stage].push(a);
  }
  const transitionMap: Record<string, StageTransition> = {};
  for (const t of stageHistory) {
    transitionMap[t.toStage] = t;
  }

  return (
    <div className="relative pl-8">
      {/* vertical spine */}
      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

      {STAGES.map((stage, idx) => {
        const config = STAGE_CONFIG[stage];
        const tl = timelineMap[stage];
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isUpcoming = idx > currentIdx;
        const isOpen = expanded === stage;

        const status = tl?.status ?? (isCompleted ? "complete" : isUpcoming ? "upcoming" : "onTrack");
        const stageApprovals = approvalMap[stage] ?? [];
        const transition = transitionMap[stage];

        return (
          <div key={stage} className="relative mb-0">
            {/* node dot */}
            <div
              className={cn(
                "absolute -left-[25px] top-3 w-5 h-5 rounded-full flex items-center justify-center z-10 border-2 bg-background transition-colors",
                isCompleted
                  ? "border-muted-foreground/40"
                  : isCurrent
                    ? "border-foreground ring-2 ring-foreground/20"
                    : "border-muted",
              )}
            >
              {isCompleted ? (
                <Check className="w-2.5 h-2.5 text-muted-foreground" />
              ) : isCurrent ? (
                <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
              ) : config.gate === "signoff" ? (
                <Lock className="w-2.5 h-2.5 text-muted-foreground/40" />
              ) : (
                <Circle className="w-2 h-2 text-muted-foreground/30" />
              )}
            </div>

            {/* row */}
            <button
              onClick={() => setExpanded(isOpen ? null : stage)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-md transition-colors group",
                isOpen ? "bg-accent" : "hover:bg-accent/50",
                isUpcoming && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2">
                {/* stage number */}
                <span className="text-[10px] tabular-nums text-muted-foreground w-5 shrink-0">
                  {idx + 1}
                </span>

                {/* label */}
                <span className={cn("text-sm font-medium flex-1", isCurrent && "text-foreground")}>
                  {config.label}
                </span>

                {/* risk badge for active/at-risk */}
                {tl && status !== "complete" && status !== "upcoming" && (
                  <span className={cn("text-[10px] font-medium uppercase tracking-wide", RISK_COLOR[status])}>
                    {status === "onTrack" ? "on track" : status === "atRisk" ? "at risk" : status}
                  </span>
                )}

                {/* owner chip */}
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {CHANNEL_LABELS[config.ownerChannel] ?? config.ownerChannel}
                </span>

                {/* expand chevron */}
                <span className="text-muted-foreground/50 shrink-0">
                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
              </div>

              {/* thin risk accent line under label when not expanded */}
              {!isOpen && tl && (
                <div className={cn("mt-1.5 h-px w-full rounded", RISK_LINE[status])} />
              )}
            </button>

            {/* expanded detail */}
            {isOpen && (
              <div className="mx-3 mb-1 px-3 py-2.5 rounded-b-md border border-t-0 border-accent bg-accent/30 text-xs space-y-2">
                {/* dates */}
                {tl ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>
                      <p className="text-muted-foreground">Target</p>
                      <p className="font-medium">{fmt(tl.targetDate)}</p>
                    </div>
                    {tl.actualDate && (
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-medium">{fmt(tl.actualDate)}</p>
                      </div>
                    )}
                    {tl.enteredAt && !tl.actualDate && (
                      <div>
                        <p className="text-muted-foreground">Started</p>
                        <p className="font-medium">{fmt(tl.enteredAt)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">SLA</p>
                      <p className="font-medium">{config.slaDays}d</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Not yet started · SLA {config.slaDays}d</p>
                )}

                {/* risk reason */}
                {tl?.riskReason && status !== "complete" && (
                  <p className={cn("flex gap-1 items-start", RISK_COLOR[status])}>
                    <Zap className="w-3 h-3 mt-0.5 shrink-0" />
                    {tl.riskReason}
                  </p>
                )}

                {/* transition note */}
                {transition?.notes && (
                  <div className="border-t border-border/50 pt-2">
                    <p className="text-muted-foreground">Entry note</p>
                    <p>{transition.notes}</p>
                  </div>
                )}

                {/* approvals */}
                {stageApprovals.length > 0 && (
                  <div className="border-t border-border/50 pt-2 space-y-1">
                    <p className="text-muted-foreground">
                      {stageApprovals.length === 1 ? "Approval" : "Approvals"}
                    </p>
                    {stageApprovals.map((a, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="font-medium">{a.approvedBy}</span>
                        <span className="text-muted-foreground">{fmt(a.approvedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* gate type */}
                {config.gate === "signoff" && stageApprovals.length === 0 && !isCompleted && (
                  <p className="flex gap-1 items-center text-muted-foreground">
                    <Lock className="w-3 h-3" /> Requires signoff to advance
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
