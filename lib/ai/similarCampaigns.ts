import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAiRun } from "./aiRun";
import { BRIEF_GENERATOR_MODEL as DEFAULT_MODEL, getAnthropic } from "./client";

// Finds the 3 most-similar past campaigns to the target campaign based on
// intake content + brief summary. Used on the brief page to give Strategy a
// quick reference and to seed the AI risk scorer's cold-start problem (when
// the target stage has limited historical data, the AI can lean on similar
// campaigns' actual durations).
//
// Failure mode: like everything else in /lib/ai, on any error we return the
// top N most recent past campaigns as a stub fallback and log to AiRun.

const RESULT_LIMIT = 3;
const SIMILARITY_MODEL = DEFAULT_MODEL;

export interface SimilarCampaign {
  campaignId: string;
  name: string;
  client: string;
  currentStage: string;
  status: string;
  deployedAt: string | null;
  reason: string;
}

interface FindSimilarInput {
  campaignId: string;
}

const responseSchema = z.object({
  matches: z
    .array(
      z.object({
        campaignId: z.string(),
        reason: z.string().min(1).max(280),
      }),
    )
    .max(RESULT_LIMIT),
});

const SYSTEM_PROMPT = `You rank past Ford Pro CRM campaigns by similarity to a target campaign.

Inputs:
- A target campaign: name, client, current stage, intake form, brief summary if present.
- A roster of past campaigns: id, name, client, current stage, intake summary, brief summary if present, deployed timestamp.

Pick the ${RESULT_LIMIT} most similar past campaigns to the target.

Criteria (in order):
1. Audience overlap (B2B fleet vs commercial vs Super Duty, etc.).
2. Objective overlap (test drives vs awareness vs reactivation vs launch).
3. Campaign type / send count.

Return only JSON: { matches: [{ campaignId, reason }] }. Each reason is one
short sentence naming the concrete overlap. Never invent ids — only return
ids that appear in the roster.`;

function summarizeIntake(raw: string | null | undefined): string {
  if (!raw) return "(no intake)";
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const pick = (k: string) => (typeof parsed[k] === "string" ? (parsed[k] as string).trim() : "");
    const out = [
      pick("summary") && `Summary: ${pick("summary")}`,
      pick("objective") && `Objective: ${pick("objective")}`,
      pick("audience") && `Audience: ${pick("audience")}`,
      pick("campaignType") && `Type: ${pick("campaignType")}`,
    ].filter(Boolean);
    return out.length > 0 ? out.join(". ") : JSON.stringify(parsed).slice(0, 200);
  } catch {
    return raw.slice(0, 200);
  }
}

function summarizeBrief(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { summary?: string };
    return parsed.summary ?? "";
  } catch {
    return "";
  }
}

async function loadRoster(excludeCampaignId: string) {
  return prisma.workflowCampaign.findMany({
    where: { id: { not: excludeCampaignId } },
    orderBy: { createdAt: "desc" },
    take: 40, // cap roster so prompt stays bounded
    select: {
      id: true,
      name: true,
      client: true,
      currentStage: true,
      status: true,
      deployedAt: true,
      intake: { select: { rawForm: true } },
      briefDeck: { select: { highLevelJourney: true } },
    },
  });
}

async function loadTarget(campaignId: string) {
  return prisma.workflowCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      client: true,
      currentStage: true,
      intake: { select: { rawForm: true } },
      briefDeck: { select: { highLevelJourney: true } },
    },
  });
}

// Lightweight target/roster shapes used by the AI core. Exported so tests can
// drive rankSimilarCampaigns() with synthetic data and avoid hitting prisma.
export interface SimilarityTarget {
  id: string;
  name: string;
  client: string;
  currentStage: string;
  intake?: { rawForm: string } | null;
  briefDeck?: { highLevelJourney: string } | null;
}
export interface SimilarityRosterEntry {
  id: string;
  name: string;
  client: string;
  currentStage: string;
  status: string;
  deployedAt: Date | null;
  intake?: { rawForm: string } | null;
  briefDeck?: { highLevelJourney: string } | null;
}

export async function findSimilarCampaigns(
  input: FindSimilarInput,
): Promise<{ matches: SimilarCampaign[]; source: "ai" | "stub" }> {
  const target = await loadTarget(input.campaignId);
  if (!target) return { matches: [], source: "stub" };

  const roster = await loadRoster(input.campaignId);
  if (roster.length === 0) return { matches: [], source: "stub" };
  return rankSimilarCampaigns(target, roster);
}

/** AI core split out from prisma so it's directly testable with synthetic data. */
export async function rankSimilarCampaigns(
  target: SimilarityTarget,
  roster: SimilarityRosterEntry[],
): Promise<{ matches: SimilarCampaign[]; source: "ai" | "stub" }> {
  if (roster.length === 0) return { matches: [], source: "stub" };

  const stub = (): SimilarCampaign[] =>
    roster.slice(0, RESULT_LIMIT).map((c) => ({
      campaignId: c.id,
      name: c.name,
      client: c.client,
      currentStage: c.currentStage,
      status: c.status,
      deployedAt: c.deployedAt?.toISOString() ?? null,
      reason: "Most recent campaign (no AI ranking available).",
    }));

  const client = getAnthropic();
  if (!client) {
    await logAiRun({
      campaignId: target.id,
      feature: "similar_campaigns",
      model: SIMILARITY_MODEL,
      input: { targetId: target.id, rosterSize: roster.length },
      output: { error: "ANTHROPIC_API_KEY is not set" },
      status: "fallback",
    });
    return { matches: stub(), source: "stub" };
  }

  const startedAt = Date.now();
  const targetBlock = [
    `Target campaign:`,
    `  id: ${target.id}`,
    `  name: ${target.name}`,
    `  client: ${target.client}`,
    `  currentStage: ${target.currentStage}`,
    `  intake: ${summarizeIntake(target.intake?.rawForm)}`,
    summarizeBrief(target.briefDeck?.highLevelJourney) ? `  brief: ${summarizeBrief(target.briefDeck?.highLevelJourney)}` : null,
  ].filter(Boolean).join("\n");

  const rosterBlock = roster
    .map((c) => {
      const briefSummary = summarizeBrief(c.briefDeck?.highLevelJourney);
      return [
        `- id: ${c.id}`,
        `  name: ${c.name}`,
        `  client: ${c.client}`,
        `  currentStage: ${c.currentStage}`,
        `  status: ${c.status}`,
        `  deployedAt: ${c.deployedAt?.toISOString() ?? "not deployed"}`,
        `  intake: ${summarizeIntake(c.intake?.rawForm)}`,
        briefSummary ? `  brief: ${briefSummary}` : null,
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");

  const userPrompt = `${targetBlock}\n\nRoster (${roster.length}):\n\n${rosterBlock}`;

  try {
    const response = await client.messages.create({
      model: SIMILARITY_MODEL,
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
              matches: {
                type: "array",
                maxItems: RESULT_LIMIT,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    campaignId: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["campaignId", "reason"],
                },
              },
            },
            required: ["matches"],
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
    const validated = responseSchema.parse(parsed);

    // Hydrate with the roster metadata. Drop any unknown ids.
    const byId = new Map(roster.map((c) => [c.id, c]));
    const matches: SimilarCampaign[] = [];
    for (const m of validated.matches) {
      const c = byId.get(m.campaignId);
      if (!c) continue;
      matches.push({
        campaignId: c.id,
        name: c.name,
        client: c.client,
        currentStage: c.currentStage,
        status: c.status,
        deployedAt: c.deployedAt?.toISOString() ?? null,
        reason: m.reason,
      });
    }

    await logAiRun({
      campaignId: target.id,
      feature: "similar_campaigns",
      model: SIMILARITY_MODEL,
      input: { targetId: target.id, rosterSize: roster.length },
      output: { matches },
      tokensIn: response.usage?.input_tokens ?? null,
      tokensOut: response.usage?.output_tokens ?? null,
      durationMs,
      status: matches.length > 0 ? "ok" : "fallback",
    });

    if (matches.length === 0) return { matches: stub(), source: "stub" };
    return { matches, source: "ai" };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    await logAiRun({
      campaignId: target.id,
      feature: "similar_campaigns",
      model: SIMILARITY_MODEL,
      input: { targetId: target.id, rosterSize: roster.length },
      output: { error: message },
      durationMs,
      status: "fallback",
    });
    return { matches: stub(), source: "stub" };
  }
}
