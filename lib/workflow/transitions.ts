import {
  STAGES,
  type Stage,
  getNextStage,
  getStageConfig,
  isValidStage,
} from "./stages";

// Pure state-machine transition logic. No DB access here — callers handle
// persistence. Every WorkflowCampaign stage change should run through this
// to keep entry actions, gate checks, and history all in one place.

export interface TransitionInput {
  from: Stage;
  to: Stage;
  /** Approval records that exist for the FROM stage. Used to enforce signoff gates. */
  approvalsForFromStage?: { channel: string }[];
  /** Set false to bypass the signoff gate (e.g. admin override). Defaults true. */
  enforceGate?: boolean;
}

export type TransitionResult =
  | { ok: true; from: Stage; to: Stage; entryActions: ReturnType<typeof getStageConfig>["entryActions"] }
  | { ok: false; reason: string };

export function planTransition(input: TransitionInput): TransitionResult {
  const { from, to, approvalsForFromStage = [], enforceGate = true } = input;

  if (!isValidStage(from)) return { ok: false, reason: `Unknown source stage: ${from}` };
  if (!isValidStage(to)) return { ok: false, reason: `Unknown target stage: ${to}` };
  if (from === to) return { ok: false, reason: "Source and target stages are identical" };

  const fromIdx = STAGES.indexOf(from);
  const toIdx = STAGES.indexOf(to);

  // Only allow advancing by exactly one stage (forward) or going back to any prior stage.
  // Forward jumps (skipping stages) are disallowed in v1 — the workflow must walk through
  // every stage so its history and SLA tracking remain meaningful. Backward moves are
  // unrestricted so a campaign can be "kicked back" for rework at any earlier point.
  if (toIdx > fromIdx + 1) {
    return { ok: false, reason: `Cannot skip stages (${from} → ${to})` };
  }

  if (enforceGate && toIdx === fromIdx + 1) {
    const fromConfig = getStageConfig(from);
    if (fromConfig.gate === "signoff") {
      const ownerApproved = approvalsForFromStage.some((a) => a.channel === fromConfig.ownerChannel);
      if (!ownerApproved) {
        return {
          ok: false,
          reason: `Stage "${from}" requires signoff from ${fromConfig.ownerChannel} before advancing`,
        };
      }
    }
  }

  return { ok: true, from, to, entryActions: getStageConfig(to).entryActions };
}

export function planAdvance(from: Stage, approvalsForFromStage?: { channel: string }[]): TransitionResult {
  const next = getNextStage(from);
  if (!next) return { ok: false, reason: `${from} is the terminal stage` };
  return planTransition({ from, to: next, approvalsForFromStage });
}
