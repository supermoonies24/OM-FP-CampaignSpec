import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";
import { logAiRun } from "./aiRun";
import { BRIEF_GENERATOR_MODEL as DEFAULT_MODEL, getAnthropic } from "./client";

// When someone kicks a campaign back to an earlier stage, the StageTransition
// gets a `notes` field that audits *why*. Writing that note from scratch in
// the middle of a busy day is friction; this drafter asks Claude to summarize
// the recent activity into a candid 1-2 sentence reason that the user can
// accept verbatim, edit, or discard.
//
// Inputs: stage they're kicking back FROM and TO, plus the recent comments
// and the most recent transition for context.

const MODEL = DEFAULT_MODEL;

export interface KickbackDrafterInput {
  campaignId: string;
  fromStage: string;
  fromStageLabel: string;
  toStage: string;
  toStageLabel: string;
  /** Comments on the campaign, newest first. */
  recentComments: { authorEmail: string; body: string; createdAt: Date }[];
  /** Last stage transition (the one being reversed, typically). */
  lastTransition?: { fromStage: string | null; toStage: string; notes: string | null; createdAt: Date } | null;
}

export interface KickbackDraft {
  reason: string;
  source: "ai" | "stub";
}

const schema = z.object({ reason: z.string().min(5).max(280) });

const SYSTEM_PROMPT = `You draft kick-back notes for a Ford Pro CRM campaign
workflow tracker. When a stage owner sends a campaign back to an earlier
stage, they need to leave a short audit note explaining why.

Output: { reason: <1-2 sentences> }

Rules:
- Direct, neutral tone. No filler. No emoji. No "Hi team".
- Cite the concrete signal from the recent comments or transition history
  when possible.
- Keep it under 240 characters when possible. Hard cap 280.
- If recent activity is genuinely empty or off-topic, say "Returning to
  <stage> for additional review — see latest comments." rather than
  fabricating a reason.`;

function stubReason(input: KickbackDrafterInput): string {
  const latest = input.recentComments[0];
  if (latest) {
    const snippet = latest.body.length > 140 ? `${latest.body.slice(0, 140)}…` : latest.body;
    return `Returning to ${input.toStageLabel}: ${snippet}`;
  }
  return `Returning to ${input.toStageLabel} for additional review.`;
}

export async function draftKickbackReason(input: KickbackDrafterInput): Promise<KickbackDraft> {
  const client = getAnthropic();
  if (!client) {
    await logAiRun({
      campaignId: input.campaignId,
      feature: "kickback_drafter",
      model: MODEL,
      input: { fromStage: input.fromStage, toStage: input.toStage, commentCount: input.recentComments.length },
      output: { error: "ANTHROPIC_API_KEY is not set" },
      status: "fallback",
    });
    return { reason: stubReason(input), source: "stub" };
  }

  const now = new Date();
  const startedAt = Date.now();
  const commentBlock = input.recentComments.slice(0, 8).map((c) => {
    const days = differenceInCalendarDays(now, c.createdAt);
    const ago = days === 0 ? "today" : `${days}d ago`;
    return `  - [${ago}] ${c.authorEmail}: ${c.body.length > 280 ? `${c.body.slice(0, 280)}…` : c.body}`;
  }).join("\n") || "  (no recent comments)";

  const lastTx = input.lastTransition
    ? `Last transition: ${input.lastTransition.fromStage ?? "(start)"} → ${input.lastTransition.toStage}${input.lastTransition.notes ? ` — ${input.lastTransition.notes}` : ""}`
    : "Last transition: (none on record)";

  const userPrompt = [
    `Kick-back: ${input.fromStageLabel} (${input.fromStage}) → ${input.toStageLabel} (${input.toStage})`,
    lastTx,
    `Recent comments:\n${commentBlock}`,
  ].join("\n\n");

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { reason: { type: "string" } },
            required: ["reason"],
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
    const validated = schema.parse(parsed);

    await logAiRun({
      campaignId: input.campaignId,
      feature: "kickback_drafter",
      model: MODEL,
      input: { fromStage: input.fromStage, toStage: input.toStage, commentCount: input.recentComments.length },
      output: validated,
      tokensIn: response.usage?.input_tokens ?? null,
      tokensOut: response.usage?.output_tokens ?? null,
      durationMs,
      status: "ok",
    });

    return { reason: validated.reason, source: "ai" };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    await logAiRun({
      campaignId: input.campaignId,
      feature: "kickback_drafter",
      model: MODEL,
      input: { fromStage: input.fromStage, toStage: input.toStage, commentCount: input.recentComments.length },
      output: { error: message },
      durationMs,
      status: "fallback",
    });
    return { reason: stubReason(input), source: "stub" };
  }
}
