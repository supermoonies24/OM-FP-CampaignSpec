import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";
import { STAGE_CONFIG, isValidStage } from "@/lib/workflow/stages";
import type { RiskOutcome } from "@/lib/workflow/risk";
import { scoreRisk } from "@/lib/workflow/risk";
import { logAiRun } from "./aiRun";
import { BRIEF_GENERATOR_MODEL as DEFAULT_MODEL, getAnthropic } from "./client";

// Phase 2b: replaces the deterministic baseline in lib/workflow/risk.ts for
// OPEN TimelineItems. Closed items (those with an actualDate) still use the
// deterministic scorer — there's nothing for the model to predict once the
// stage is done. AI inputs include comment activity, review-round count, and
// historical avg duration for the stage so the model can reason about cadence
// and stuck reviews. On any failure, falls back to scoreRisk().

const RISK_MODEL = DEFAULT_MODEL; // claude-opus-4-8

export interface RiskScorerInput {
  campaignId: string;
  campaignName: string;
  stage: string;
  targetDate: Date;
  actualDate: Date | null;
  /** Recent comment events feeding "is this stuck?" signal. */
  recentCommentCount?: number;
  daysSinceLastComment?: number | null;
  /** Approval rounds recorded for the current stage. */
  approvalsForStage?: number;
  /** Mean days the stage has taken across prior closed timeline items. */
  historicalAvgDays?: number | null;
}

const riskSchema = z.object({
  status: z.enum(["complete", "onTrack", "atRisk", "late"]),
  riskScore: z.number().min(0).max(1),
  riskReason: z.string().min(1).max(280),
});

const SYSTEM_PROMPT = `You are the risk scorer for the OneMagnify Ford Pro CRM workflow tracker.
You evaluate a single open campaign timeline item and decide whether it is on
track, at risk, or late.

Return ONLY a JSON object: { status, riskScore, riskReason }.

Rules:
- status is one of: "onTrack" | "atRisk" | "late" | "complete".
- Never return "complete" — open items by definition aren't complete; the
  caller filters those out.
- riskScore is a number between 0 and 1. Use these calibration anchors:
    < 0.3   → onTrack, comfortable cushion.
    0.3-0.6 → onTrack with limited slack.
    0.6-0.85 → atRisk.
    > 0.85   → late, or essentially certain to miss.
- riskReason is a single short sentence (under 280 chars) explaining the
  score in terms a project manager will recognize. Reference concrete signal
  (days remaining, comment silence, review rounds, historical average).
- Past target date with no actualDate → almost always "late".
- Stale comment activity on a stage that depends on reviewer feedback is a
  strong "atRisk" signal even before the target date.`;

interface ScoreContext {
  scoredAt: Date;
}

export async function scoreRiskAi(
  input: RiskScorerInput,
  ctx: ScoreContext = { scoredAt: new Date() },
): Promise<RiskOutcome> {
  const fallbackInput = {
    stage: input.stage,
    targetDate: input.targetDate,
    actualDate: input.actualDate,
  };

  // Closed items: deterministic, no need to call the model.
  if (input.actualDate) {
    return scoreRisk(fallbackInput, ctx.scoredAt);
  }

  const client = getAnthropic();
  if (!client) {
    await logAiRun({
      campaignId: input.campaignId,
      feature: "risk_scorer",
      model: RISK_MODEL,
      input: serializeInput(input, ctx),
      output: { error: "ANTHROPIC_API_KEY is not set" },
      status: "fallback",
    });
    return scoreRisk(fallbackInput, ctx.scoredAt);
  }

  const startedAt = Date.now();
  const userPrompt = buildUserPrompt(input, ctx);

  try {
    const response = await client.messages.create({
      model: RISK_MODEL,
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              status: { type: "string", enum: ["onTrack", "atRisk", "late"] },
              riskScore: { type: "number", minimum: 0, maximum: 1 },
              riskReason: { type: "string" },
            },
            required: ["status", "riskScore", "riskReason"],
          } as Record<string, unknown>,
        },
      },
    });

    const durationMs = Date.now() - startedAt;

    const textBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text",
    );
    if (!textBlock) throw new Error("Claude response contained no text block");

    const parsed = JSON.parse(textBlock.text);
    const validated = riskSchema.parse(parsed);

    await logAiRun({
      campaignId: input.campaignId,
      feature: "risk_scorer",
      model: RISK_MODEL,
      input: serializeInput(input, ctx),
      output: validated,
      tokensIn: response.usage?.input_tokens ?? null,
      tokensOut: response.usage?.output_tokens ?? null,
      durationMs,
      status: "ok",
    });

    return validated;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    await logAiRun({
      campaignId: input.campaignId,
      feature: "risk_scorer",
      model: RISK_MODEL,
      input: serializeInput(input, ctx),
      output: { error: message },
      durationMs,
      status: "fallback",
    });
    return scoreRisk(fallbackInput, ctx.scoredAt);
  }
}

function buildUserPrompt(input: RiskScorerInput, ctx: ScoreContext): string {
  const stageLabel = isValidStage(input.stage)
    ? STAGE_CONFIG[input.stage].label
    : input.stage;
  const slaDays = isValidStage(input.stage)
    ? STAGE_CONFIG[input.stage].slaDays
    : null;
  const daysToTarget = differenceInCalendarDays(input.targetDate, ctx.scoredAt);

  const lines = [
    `Campaign: ${input.campaignName}`,
    `Stage: ${input.stage} (${stageLabel})`,
    `Target date: ${input.targetDate.toISOString().slice(0, 10)} (${daysToTarget}d from today)`,
    `Stage SLA: ${slaDays ?? "unknown"} days`,
    `Approvals already recorded for this stage: ${input.approvalsForStage ?? 0}`,
    `Recent comment activity: ${input.recentCommentCount ?? 0} comments in the last 14 days`,
    input.daysSinceLastComment === null || input.daysSinceLastComment === undefined
      ? `Days since last comment: no comments yet`
      : `Days since last comment: ${input.daysSinceLastComment}d`,
    input.historicalAvgDays
      ? `Historical avg days for this stage across past campaigns: ${input.historicalAvgDays.toFixed(1)}d`
      : `Historical avg: not enough data yet (cold start — use SLA as baseline)`,
  ];

  return lines.join("\n");
}

function serializeInput(input: RiskScorerInput, ctx: ScoreContext) {
  return {
    campaignId: input.campaignId,
    campaignName: input.campaignName,
    stage: input.stage,
    targetDate: input.targetDate.toISOString(),
    actualDate: input.actualDate?.toISOString() ?? null,
    recentCommentCount: input.recentCommentCount ?? null,
    daysSinceLastComment: input.daysSinceLastComment ?? null,
    approvalsForStage: input.approvalsForStage ?? null,
    historicalAvgDays: input.historicalAvgDays ?? null,
    scoredAt: ctx.scoredAt.toISOString(),
  };
}
