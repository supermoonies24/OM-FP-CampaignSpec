import { differenceInCalendarDays } from "date-fns";
import { STAGE_CONFIG, isValidStage } from "./stages";

// Deterministic baseline risk scorer. VISION.md §8.2 calls for an AI
// scorer in Phase 2; until that exists, this function fills the gap so
// the timeline view has something real to render and so we have a
// reproducible baseline to compare AI scores against.

export interface OpenTimelineItem {
  stage: string;
  targetDate: Date;
  actualDate: Date | null;
}

export interface RiskOutcome {
  status: "complete" | "onTrack" | "atRisk" | "late";
  riskScore: number; // 0..1
  riskReason: string;
}

export function scoreRisk(item: OpenTimelineItem, today: Date = new Date()): RiskOutcome {
  if (item.actualDate) {
    const onTime = item.actualDate <= item.targetDate;
    return {
      status: "complete",
      riskScore: 0,
      riskReason: onTime ? "Completed on or before target" : "Completed after target",
    };
  }

  const daysToTarget = differenceInCalendarDays(item.targetDate, today);

  if (daysToTarget < 0) {
    return {
      status: "late",
      riskScore: 1,
      riskReason: `Past target by ${Math.abs(daysToTarget)}d`,
    };
  }
  if (daysToTarget === 0) {
    return { status: "atRisk", riskScore: 0.9, riskReason: "Due today" };
  }

  const slaDays = isValidStage(item.stage) ? STAGE_CONFIG[item.stage].slaDays : 1;
  const quarter = Math.max(1, Math.ceil(slaDays * 0.25));
  if (daysToTarget <= quarter) {
    return {
      status: "atRisk",
      riskScore: 0.7,
      riskReason: `${daysToTarget}d remaining (<25% of ${slaDays}d SLA)`,
    };
  }

  return {
    status: "onTrack",
    riskScore: Math.max(0, 1 - daysToTarget / Math.max(1, slaDays)),
    riskReason: `${daysToTarget}d to target`,
  };
}
