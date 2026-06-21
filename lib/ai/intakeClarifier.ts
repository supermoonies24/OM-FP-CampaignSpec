import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAiRun } from "./aiRun";
import { BRIEF_GENERATOR_MODEL as DEFAULT_MODEL, getAnthropic } from "./client";

// AI intake clarifier. When intake form fields are sparse, Strategy needs to
// circle back with stakeholders before the brief generator can produce useful
// output. This module asks Claude to surface 3-5 targeted clarification
// questions, ordered by which would most improve brief quality.
//
// Failure mode: returns a generic checklist of clarifications as stub.

const QUESTION_LIMIT = 5;
const MODEL = DEFAULT_MODEL;

export interface IntakeClarification {
  question: string;
  reason: string;
  field?: string; // optional intake-form field the answer would fill
}

const schema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(5).max(280),
        reason: z.string().min(5).max(280),
        field: z.string().optional(),
      }),
    )
    .max(QUESTION_LIMIT),
});

const SYSTEM_PROMPT = `You audit Ford Pro CRM campaign intake forms and ask the
follow-up questions Strategy needs answered before the brief can be drafted.

Inputs: campaign name, client, intake form JSON.

Return only JSON: { questions: [{ question, reason, field? }] }.

Rules:
- At most ${QUESTION_LIMIT} questions, ordered by which would most improve brief quality.
- Each question should be answerable in 1-2 sentences by a stakeholder.
- "reason" explains why this answer matters for the brief (audience targeting,
  SFMC journey design, send count, timeline).
- "field" is the intake-form field the answer would populate, if obvious
  (e.g. "audience", "objective", "campaignType", "numSends").
- If the intake is already comprehensive, return { questions: [] } — never
  fabricate questions to fill the quota.`;

function intakeIsSparse(intake: Record<string, unknown> | null): boolean {
  if (!intake) return true;
  const fields = ["summary", "objective", "audience", "campaignType"];
  const filled = fields.filter((k) => typeof intake[k] === "string" && (intake[k] as string).trim().length >= 8);
  return filled.length < 3;
}

export async function findIntakeClarifications(
  campaignId: string,
): Promise<{ questions: IntakeClarification[]; source: "ai" | "stub" | "skipped" }> {
  const campaign = await prisma.workflowCampaign.findUnique({
    where: { id: campaignId },
    select: { name: true, client: true, intake: { select: { rawForm: true } } },
  });
  if (!campaign) return { questions: [], source: "skipped" };

  const intake = campaign.intake
    ? (() => { try { return JSON.parse(campaign.intake.rawForm) as Record<string, unknown>; } catch { return null; } })()
    : null;

  return clarifyIntakeFromData({
    campaignId,
    campaignName: campaign.name,
    client: campaign.client,
    intake,
  });
}

export interface ClarifyIntakeInput {
  campaignId: string;
  campaignName: string;
  client: string;
  intake: Record<string, unknown> | null;
}

/** AI core split out from prisma so it's directly testable with synthetic data. */
export async function clarifyIntakeFromData(
  args: ClarifyIntakeInput,
): Promise<{ questions: IntakeClarification[]; source: "ai" | "stub" | "skipped" }> {
  const { campaignId, campaignName, client: clientName, intake } = args;

  // Don't burn tokens on well-filled intakes.
  if (!intakeIsSparse(intake)) {
    return { questions: [], source: "skipped" };
  }

  const stub: IntakeClarification[] = [
    { question: "Who is the primary audience segment for this campaign?", reason: "Audience drives the data extension and journey entry source.", field: "audience" },
    { question: "What is the primary business objective — awareness, test drives, reactivation, or another?", reason: "Objective shapes touchpoint sequence and CTAs.", field: "objective" },
    { question: "How many email sends and over what cadence?", reason: "Send count determines journey activity structure and timeline.", field: "numSends" },
  ];

  const client = getAnthropic();
  if (!client) {
    await logAiRun({
      campaignId,
      feature: "intake_clarifier",
      model: MODEL,
      input: { campaignId, intakeFields: intake ? Object.keys(intake) : [] },
      output: { error: "ANTHROPIC_API_KEY is not set" },
      status: "fallback",
    });
    return { questions: stub, source: "stub" };
  }

  const startedAt = Date.now();
  const userPrompt = `Campaign: ${campaignName}\nClient: ${clientName}\n\nIntake form:\n${JSON.stringify(intake ?? {}, null, 2)}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
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
              questions: {
                type: "array",
                maxItems: QUESTION_LIMIT,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    question: { type: "string" },
                    reason: { type: "string" },
                    field: { type: "string" },
                  },
                  required: ["question", "reason"],
                },
              },
            },
            required: ["questions"],
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
      campaignId,
      feature: "intake_clarifier",
      model: MODEL,
      input: { campaignId, intakeFields: intake ? Object.keys(intake) : [] },
      output: validated,
      tokensIn: response.usage?.input_tokens ?? null,
      tokensOut: response.usage?.output_tokens ?? null,
      durationMs,
      status: "ok",
    });

    return { questions: validated.questions, source: "ai" };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    await logAiRun({
      campaignId,
      feature: "intake_clarifier",
      model: MODEL,
      input: { campaignId, intakeFields: intake ? Object.keys(intake) : [] },
      output: { error: message },
      durationMs,
      status: "fallback",
    });
    return { questions: stub, source: "stub" };
  }
}
