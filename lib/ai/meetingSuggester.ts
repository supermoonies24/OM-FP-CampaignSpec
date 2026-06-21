import { z } from "zod";
import { logAiRun } from "./aiRun";
import { BRIEF_GENERATOR_MODEL as DEFAULT_MODEL, getAnthropic } from "./client";

// VISION.md §8.3 — lightweight meeting time suggester. Until Phase 3 wires
// Microsoft Graph FindMeetingTimes, this returns a priority-ordered list of
// suggested time slots reasoned about by Claude. Strategy can paste them into
// a meeting invite.
//
// The model gets: attendees + their typical timezones, urgency, prior cadence
// for the campaign (last few meeting times), and a target window. It returns
// 3-5 slots ranked best→worst with one-sentence rationales.

const SLOT_LIMIT = 5;
const MODEL = DEFAULT_MODEL;

export interface MeetingSlot {
  startsAt: string; // ISO 8601
  durationMinutes: number;
  reason: string;
}

export interface SuggestMeetingTimesInput {
  campaignId?: string;
  stageLabel: string;
  attendees: string[];                 // email or display label per attendee
  durationMinutes?: number;            // default 30
  urgency?: "low" | "normal" | "high"; // default normal
  /** Prior meetings for this campaign, latest first — used to detect cadence. */
  recentMeetings?: { startsAt: string; durationMinutes: number }[];
  /** Window to suggest within — defaults to "next 7 business days". */
  windowStart?: string;
  windowEnd?: string;
  defaultTimezone?: string; // IANA, e.g. "America/New_York"
}

const slotSchema = z.object({
  slots: z
    .array(
      z.object({
        startsAt: z.string(),
        durationMinutes: z.number().int().positive(),
        reason: z.string().min(3).max(280),
      }),
    )
    .max(SLOT_LIMIT),
});

const SYSTEM_PROMPT = `You suggest meeting times for the OneMagnify Ford Pro
CRM workflow team. Each suggestion must be a concrete slot — a wall-clock
start time in ISO 8601 with a timezone offset, plus a duration.

Heuristics:
- Default working hours are 9:00–17:00 local time, Mon–Fri.
- Avoid Friday afternoons after 14:00 and Monday before 10:00.
- Spread suggestions across multiple days when urgency allows.
- For low urgency prefer mid-morning Tue/Wed/Thu.
- For high urgency, propose the earliest acceptable slots — including same
  day if the current time is before 14:00.
- If recent meetings show a recurring cadence (e.g. Wednesdays 10:00),
  prefer keeping that cadence unless urgency demands otherwise.

Return only JSON: { slots: [{ startsAt, durationMinutes, reason }] }. Each
"reason" is one short sentence explaining why this slot fits.`;

function defaultWindow(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  end.setHours(17, 0, 0, 0);
  return { start, end };
}

function stubSlots(input: SuggestMeetingTimesInput, now: Date): MeetingSlot[] {
  const dur = input.durationMinutes ?? 30;
  const { start } = defaultWindow(now);
  // Stub: next 3 business days at 10:00.
  const out: MeetingSlot[] = [];
  let d = new Date(start);
  if (d <= now) d = new Date(now.getTime() + 60 * 60 * 1000);
  let added = 0;
  while (added < 3) {
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const day = d.getDay();
    if (day === 0 || day === 6) continue;
    out.push({
      startsAt: d.toISOString(),
      durationMinutes: dur,
      reason: "Mid-morning weekday slot (default heuristic — AI suggester unavailable).",
    });
    added++;
  }
  return out;
}

export async function suggestMeetingTimes(
  input: SuggestMeetingTimesInput,
): Promise<{ slots: MeetingSlot[]; source: "ai" | "stub" }> {
  const now = new Date();
  const dur = input.durationMinutes ?? 30;
  const client = getAnthropic();

  if (!client) {
    await logAiRun({
      campaignId: input.campaignId ?? null,
      feature: "meeting_suggester",
      model: MODEL,
      input,
      output: { error: "ANTHROPIC_API_KEY is not set" },
      status: "fallback",
    });
    return { slots: stubSlots(input, now), source: "stub" };
  }

  const startedAt = Date.now();
  const { start, end } = defaultWindow(now);
  const windowStart = input.windowStart ?? start.toISOString();
  const windowEnd = input.windowEnd ?? end.toISOString();

  const cadence = (input.recentMeetings ?? [])
    .slice(0, 5)
    .map((m) => `  - ${m.startsAt} (${m.durationMinutes}m)`)
    .join("\n") || "  (none on record)";

  const userPrompt = [
    `Meeting purpose: ${input.stageLabel}`,
    `Attendees: ${input.attendees.join(", ") || "TBD"}`,
    `Duration: ${dur} minutes`,
    `Urgency: ${input.urgency ?? "normal"}`,
    `Suggest within window: ${windowStart} → ${windowEnd}`,
    `Default timezone: ${input.defaultTimezone ?? "America/New_York"}`,
    `Current time: ${now.toISOString()}`,
    `Recent meetings on this campaign:\n${cadence}`,
  ].join("\n");

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
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
              slots: {
                type: "array",
                maxItems: SLOT_LIMIT,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    startsAt: { type: "string" },
                    durationMinutes: { type: "number" },
                    reason: { type: "string" },
                  },
                  required: ["startsAt", "durationMinutes", "reason"],
                },
              },
            },
            required: ["slots"],
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
    const validated = slotSchema.parse(parsed);

    await logAiRun({
      campaignId: input.campaignId ?? null,
      feature: "meeting_suggester",
      model: MODEL,
      input,
      output: validated,
      tokensIn: response.usage?.input_tokens ?? null,
      tokensOut: response.usage?.output_tokens ?? null,
      durationMs,
      status: "ok",
    });

    return { slots: validated.slots, source: "ai" };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    await logAiRun({
      campaignId: input.campaignId ?? null,
      feature: "meeting_suggester",
      model: MODEL,
      input,
      output: { error: message },
      durationMs,
      status: "fallback",
    });
    return { slots: stubSlots(input, now), source: "stub" };
  }
}
