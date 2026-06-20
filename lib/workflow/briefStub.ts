import { STAGES, STAGE_CONFIG, type Stage } from "./stages";

// Deterministic brief deck stub. VISION.md §8.1 calls for a Claude API
// generator in Phase 2; this function preserves the structured-JSON
// contract (`BriefDeck` shape) so the UI and persistence layer can be
// built and tested without waiting on the AI integration. The real
// generator will replace this function body and keep the same return
// shape.

export interface BriefDeckPayload {
  highLevelJourney: {
    summary: string;
    touchpoints: { name: string; channel: string; purpose: string }[];
  };
  sfmcJourney: {
    name: string;
    entrySource: string;
    activities: { kind: string; label: string }[];
  };
  timeline: { stage: string; label: string; targetOffsetDays: number }[];
  specFormDraft: Record<string, unknown>;
}

interface BuildContext {
  campaignName: string;
  client: string;
  intakeRaw?: Record<string, unknown> | null;
}

export function buildBriefStub(ctx: BuildContext): BriefDeckPayload {
  const summary = (ctx.intakeRaw?.summary as string | undefined)?.trim() || `${ctx.campaignName} campaign for ${ctx.client}.`;
  const objective = (ctx.intakeRaw?.objective as string | undefined)?.trim() || "Drive engagement";
  const audience = (ctx.intakeRaw?.audience as string | undefined)?.trim() || "All Ford Pro CRM contacts";

  let cumulativeDays = 0;
  const timeline = STAGES.map((s: Stage) => {
    const cfg = STAGE_CONFIG[s];
    cumulativeDays += cfg.slaDays;
    return { stage: s, label: cfg.label, targetOffsetDays: cumulativeDays };
  });

  return {
    highLevelJourney: {
      summary: `${summary} Objective: ${objective}.`,
      touchpoints: [
        { name: "Pre-launch teaser", channel: "Email", purpose: `Build awareness with ${audience}` },
        { name: "Launch announcement", channel: "Email", purpose: "Drive primary CTA" },
        { name: "Follow-up reminder", channel: "Email", purpose: "Re-engage non-openers" },
      ],
    },
    sfmcJourney: {
      name: `${ctx.campaignName} Journey`,
      entrySource: "Data Extension — campaign audience",
      activities: [
        { kind: "Email", label: "Pre-launch teaser" },
        { kind: "Wait", label: "Wait 3 days" },
        { kind: "Email", label: "Launch announcement" },
        { kind: "Decision Split", label: "Opened launch email?" },
        { kind: "Email", label: "Follow-up reminder (non-openers)" },
      ],
    },
    timeline,
    specFormDraft: {
      campaignName: ctx.campaignName,
      brand: ctx.client,
      audience,
      campaignType: "Standard",
      numSends: 3,
    },
  };
}
