import { z } from "zod";
import { buildBriefStub, type BriefDeckPayload } from "@/lib/workflow/briefStub";
import { logAiRun } from "./aiRun";
import { BRIEF_GENERATOR_MODEL, getAnthropic } from "./client";
import {
  BRIEF_OUTPUT_SCHEMA,
  BRIEF_SYSTEM_PROMPT,
  buildBriefUserPrompt,
} from "./prompts/brief";

// Phase 2a: replaces the deterministic stub from Phase 1. Calls Claude with a
// structured-output schema so the response is guaranteed to parse cleanly,
// validates the parsed payload with Zod, and logs every run (success, fallback,
// or error) to the AiRun table for evaluation. On any failure, falls back to
// buildBriefStub so dev/CI without an API key — and transient model outages —
// don't break the workflow.

export interface BriefGeneratorContext {
  campaignName: string;
  client: string;
  intakeRaw?: Record<string, unknown> | null;
  campaignId?: string;
  /** Optional freeform refinement instruction ("focus more on Super Duty"). */
  instructions?: string | null;
  /** When refining, the prior brief payload so the model can iterate. */
  previousBrief?: BriefDeckPayload | null;
}

export interface GenerateBriefResult {
  payload: BriefDeckPayload;
  source: "ai" | "stub";
  model: string;
}

const briefPayloadSchema: z.ZodType<BriefDeckPayload> = z.object({
  highLevelJourney: z.object({
    summary: z.string(),
    touchpoints: z.array(
      z.object({
        name: z.string(),
        channel: z.string(),
        purpose: z.string(),
      }),
    ),
  }),
  sfmcJourney: z.object({
    name: z.string(),
    entrySource: z.string(),
    activities: z.array(
      z.object({
        kind: z.string(),
        label: z.string(),
      }),
    ),
  }),
  timeline: z.array(
    z.object({
      stage: z.string(),
      label: z.string(),
      targetOffsetDays: z.number(),
    }),
  ),
  specFormDraft: z.record(z.string(), z.unknown()),
});

export async function generateBrief(
  ctx: BriefGeneratorContext,
): Promise<GenerateBriefResult> {
  const client = getAnthropic();
  const stub = (): BriefDeckPayload => buildBriefStub(ctx);

  if (!client) {
    // No API key — silent fallback. Log once so the AiRun history shows why.
    await logAiRun({
      campaignId: ctx.campaignId ?? null,
      feature: "brief_generator",
      model: BRIEF_GENERATOR_MODEL,
      input: { campaignName: ctx.campaignName, client: ctx.client, intakeRaw: ctx.intakeRaw ?? null },
      output: { error: "ANTHROPIC_API_KEY is not set" },
      status: "fallback",
    });
    return { payload: stub(), source: "stub", model: BRIEF_GENERATOR_MODEL };
  }

  const userPrompt = buildBriefUserPrompt({
    campaignName: ctx.campaignName,
    client: ctx.client,
    intakeRaw: ctx.intakeRaw ?? null,
    instructions: ctx.instructions ?? null,
    previousBrief: ctx.previousBrief ?? null,
  });
  const startedAt = Date.now();

  try {
    const response = await client.messages.create({
      model: BRIEF_GENERATOR_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: BRIEF_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema",
          schema: BRIEF_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });

    const durationMs = Date.now() - startedAt;

    const textBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text",
    );
    if (!textBlock) {
      throw new Error("Claude response contained no text block");
    }

    const parsed = JSON.parse(textBlock.text);
    const validated = briefPayloadSchema.parse(parsed);

    await logAiRun({
      campaignId: ctx.campaignId ?? null,
      feature: "brief_generator",
      model: BRIEF_GENERATOR_MODEL,
      input: { campaignName: ctx.campaignName, client: ctx.client, intakeRaw: ctx.intakeRaw ?? null },
      output: validated,
      tokensIn: response.usage?.input_tokens ?? null,
      tokensOut: response.usage?.output_tokens ?? null,
      durationMs,
      status: "ok",
    });

    return { payload: validated, source: "ai", model: BRIEF_GENERATOR_MODEL };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);

    await logAiRun({
      campaignId: ctx.campaignId ?? null,
      feature: "brief_generator",
      model: BRIEF_GENERATOR_MODEL,
      input: { campaignName: ctx.campaignName, client: ctx.client, intakeRaw: ctx.intakeRaw ?? null },
      output: { error: message },
      durationMs,
      status: "fallback",
    });

    return { payload: stub(), source: "stub", model: BRIEF_GENERATOR_MODEL };
  }
}
