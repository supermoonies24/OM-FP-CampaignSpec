import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { suggestMeetingTimes } from "./meetingSuggester";
import { resetAnthropicForTests } from "./client";
import { setLoggerForTests, type AiRunRecord } from "./aiRun";

let captured: AiRunRecord[] = [];
let restore: () => void;

beforeEach(() => {
  captured = [];
  restore = setLoggerForTests(async (r) => { captured.push(r); });
});

afterEach(() => {
  restore();
  resetAnthropicForTests(null);
});

describe("suggestMeetingTimes", () => {
  it("returns AI slots when SDK responds", async () => {
    const fake = {
      messages: {
        create: async () => ({
          content: [{
            type: "text",
            text: JSON.stringify({
              slots: [
                { startsAt: "2026-07-01T14:00:00Z", durationMinutes: 30, reason: "Wed mid-morning Eastern." },
                { startsAt: "2026-07-02T14:00:00Z", durationMinutes: 30, reason: "Thursday backup slot." },
              ],
            }),
          }],
          usage: { input_tokens: 60, output_tokens: 30 },
        }),
      },
    };
    resetAnthropicForTests(fake as never);

    const result = await suggestMeetingTimes({
      stageLabel: "Strategy Alignment",
      attendees: ["jonah@om.com", "strategy-lead@om.com"],
    });
    assert.equal(result.source, "ai");
    assert.equal(result.slots.length, 2);
    assert.equal(captured[0].status, "ok");
  });

  it("falls back to weekday stub when SDK throws", async () => {
    resetAnthropicForTests({ messages: { create: async () => { throw new Error("boom"); } } } as never);
    const result = await suggestMeetingTimes({
      stageLabel: "Strategy Alignment",
      attendees: ["jonah@om.com"],
    });
    assert.equal(result.source, "stub");
    assert.equal(result.slots.length, 3);
    // Stub slots all fall on weekdays.
    for (const s of result.slots) {
      const day = new Date(s.startsAt).getUTCDay();
      assert.notEqual(day, 0);
      assert.notEqual(day, 6);
    }
    assert.equal(captured[0].status, "fallback");
  });

  it("falls back when API key missing", async () => {
    resetAnthropicForTests(null);
    const result = await suggestMeetingTimes({
      stageLabel: "Strategy Alignment",
      attendees: ["jonah@om.com"],
    });
    assert.equal(result.source, "stub");
    assert.equal(captured[0].status, "fallback");
  });
});
