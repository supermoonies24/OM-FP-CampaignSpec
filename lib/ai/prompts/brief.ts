import { STAGES, STAGE_CONFIG } from "@/lib/workflow/stages";

// System prompt + user prompt builder for the Brief Deck generator.
// Encodes Ford Pro CRM brief structure, SFMC Journey Builder concepts, and
// the exact BriefDeckPayload JSON shape expected by the persistence layer.

export const BRIEF_SYSTEM_PROMPT = `You are the Brief Deck generator for the OneMagnify Ford Pro CRM email team.
You produce a structured campaign brief deck JSON object that downstream code
renders into a navy-branded PowerPoint and into a draft Spec Form.

DOMAIN CONTEXT
- Ford Pro CRM is Ford's commercial-vehicle customer relationship marketing
  program. Audiences are B2B fleet/commercial buyers, not retail consumers.
- Campaigns are produced and deployed through Salesforce Marketing Cloud (SFMC)
  Journey Builder. A Journey has an entry source (typically a Data Extension),
  then a series of activities: Email sends, Wait steps, Decision Splits,
  Engagement Splits, Random Splits, Update Contact, and Exit.
- Tone is professional, capability-forward, and business-outcome focused.
  Avoid retail / consumer marketing clichés.

OUTPUT REQUIREMENTS
- Return ONLY a JSON object conforming exactly to the schema you are given.
- Do not add extra fields, commentary, or markdown fences.
- Be concrete — names like "Pre-launch teaser" and "Launch announcement" are
  preferred over generic labels like "Email 1".
- The timeline array is provided by the system (one item per workflow stage);
  match its length and stage IDs exactly. Do not invent or reorder stages.
- highLevelJourney.touchpoints: 2-6 items. Each must have a clear purpose
  tied to the campaign objective.
- sfmcJourney.activities: 3-12 items. Mix Email, Wait, and split activities.
- specFormDraft: include best-guess values for campaignName, brand, audience,
  campaignType, numSends. You may include additional spec form fields if the
  intake provides clear signal; never invent legal or compliance language.`;

export interface BriefPromptContext {
  campaignName: string;
  client: string;
  intakeRaw?: Record<string, unknown> | null;
  /** Optional freeform refinement instruction from Strategy. */
  instructions?: string | null;
  /** When refining, the previous brief payload so the model can iterate. */
  previousBrief?: unknown;
}

export function buildBriefUserPrompt(ctx: BriefPromptContext): string {
  const intakeJson = JSON.stringify(ctx.intakeRaw ?? {}, null, 2);
  const stageList = STAGES.map((s, i) => {
    const cfg = STAGE_CONFIG[s];
    return `  ${i + 1}. ${s} — ${cfg.label} (SLA ${cfg.slaDays}d)`;
  }).join("\n");

  const sections: string[] = [
    "Generate a brief deck for the following campaign.",
    `Campaign name: ${ctx.campaignName}`,
    `Client: ${ctx.client}`,
    `Intake form (raw JSON):\n${intakeJson}`,
    `Workflow stages (use these exact stage IDs in the timeline array, in order):\n${stageList}`,
    `The timeline's targetOffsetDays should be the cumulative SLA days from intake through each stage. Use the stage labels above for the timeline.label field.`,
  ];

  if (ctx.previousBrief) {
    sections.push(
      `A previous version of this brief already exists. Iterate on it rather than starting from scratch — preserve good elements and only change what the refinement instruction targets:\n${JSON.stringify(ctx.previousBrief, null, 2)}`,
    );
  }

  if (ctx.instructions && ctx.instructions.trim()) {
    sections.push(
      `REFINEMENT INSTRUCTION FROM STRATEGY (highest priority — apply this on top of everything above):\n${ctx.instructions.trim()}`,
    );
  }

  return sections.join("\n\n");
}

// JSON Schema for output_config.format. Mirrors BriefDeckPayload exactly.
// Structured outputs require additionalProperties: false on every object.
export const BRIEF_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    highLevelJourney: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        touchpoints: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              channel: { type: "string" },
              purpose: { type: "string" },
            },
            required: ["name", "channel", "purpose"],
          },
        },
      },
      required: ["summary", "touchpoints"],
    },
    sfmcJourney: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        entrySource: { type: "string" },
        activities: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              kind: { type: "string" },
              label: { type: "string" },
            },
            required: ["kind", "label"],
          },
        },
      },
      required: ["name", "entrySource", "activities"],
    },
    timeline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          stage: { type: "string" },
          label: { type: "string" },
          targetOffsetDays: { type: "number" },
        },
        required: ["stage", "label", "targetOffsetDays"],
      },
    },
    specFormDraft: {
      type: "object",
      // specFormDraft is open-ended — let the model add fields where confident.
      additionalProperties: true,
      properties: {
        campaignName: { type: "string" },
        brand: { type: "string" },
        audience: { type: "string" },
        campaignType: { type: "string" },
        numSends: { type: "number" },
      },
      required: ["campaignName", "brand", "audience", "campaignType", "numSends"],
    },
  },
  required: ["highLevelJourney", "sfmcJourney", "timeline", "specFormDraft"],
} as const;
