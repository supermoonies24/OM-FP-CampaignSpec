import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { rankSimilarCampaigns, type SimilarityRosterEntry, type SimilarityTarget } from "./similarCampaigns";
import { resetAnthropicForTests } from "./client";
import { setLoggerForTests, type AiRunRecord } from "./aiRun";

// Tests rankSimilarCampaigns — the pure AI core — without touching prisma or
// the real Anthropic API.

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

const TARGET: SimilarityTarget = {
  id: "camp_target",
  name: "Q3 Super Duty Launch",
  client: "Ford Pro",
  currentStage: "STRATEGY_DEVELOPMENT",
  intake: { rawForm: JSON.stringify({ summary: "Super Duty awareness", audience: "Fleet buyers" }) },
};

function rosterEntry(id: string, name: string, intake: Record<string, unknown> = {}): SimilarityRosterEntry {
  return {
    id, name,
    client: "Ford Pro",
    currentStage: "EMAIL_DEPLOYMENT",
    status: "shipped",
    deployedAt: new Date("2026-03-01T00:00:00Z"),
    intake: { rawForm: JSON.stringify(intake) },
  };
}

describe("rankSimilarCampaigns", () => {
  it("returns AI-ranked matches with reasons when the SDK responds with valid IDs", async () => {
    const fake = {
      messages: {
        create: async () => ({
          content: [{
            type: "text",
            text: JSON.stringify({
              matches: [
                { campaignId: "camp_a", reason: "Same Super Duty audience" },
                { campaignId: "camp_c", reason: "Similar fleet objective" },
              ],
            }),
          }],
          usage: { input_tokens: 200, output_tokens: 40 },
        }),
      },
    };
    resetAnthropicForTests(fake as never);

    const roster = [
      rosterEntry("camp_a", "Past Super Duty push", { summary: "Super Duty drive event" }),
      rosterEntry("camp_b", "Mustang teaser", { summary: "Mustang" }),
      rosterEntry("camp_c", "Fleet financing", { summary: "Fleet financing" }),
    ];

    const result = await rankSimilarCampaigns(TARGET, roster);

    assert.equal(result.source, "ai");
    assert.equal(result.matches.length, 2);
    assert.equal(result.matches[0].campaignId, "camp_a");
    assert.match(result.matches[0].reason, /Super Duty/);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].status, "ok");
  });

  it("falls back to most-recent stub when the SDK throws", async () => {
    const fake = { messages: { create: async () => { throw new Error("rate limit"); } } };
    resetAnthropicForTests(fake as never);

    const roster = [rosterEntry("camp_a", "A"), rosterEntry("camp_b", "B"), rosterEntry("camp_c", "C")];
    const result = await rankSimilarCampaigns(TARGET, roster);
    assert.equal(result.source, "stub");
    assert.equal(result.matches.length, 3);
    assert.equal(captured[0].status, "fallback");
  });

  it("falls back when API key is missing", async () => {
    resetAnthropicForTests(null);
    const roster = [rosterEntry("camp_a", "A")];
    const result = await rankSimilarCampaigns(TARGET, roster);
    assert.equal(result.source, "stub");
    assert.equal(captured[0].status, "fallback");
  });

  it("returns empty when roster is empty", async () => {
    resetAnthropicForTests(null);
    const result = await rankSimilarCampaigns(TARGET, []);
    assert.deepEqual(result, { matches: [], source: "stub" });
    assert.equal(captured.length, 0);
  });

  it("drops AI matches with unknown ids and falls back when none remain", async () => {
    const fake = {
      messages: {
        create: async () => ({
          content: [{ type: "text", text: JSON.stringify({ matches: [{ campaignId: "ghost", reason: "x" }] }) }],
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      },
    };
    resetAnthropicForTests(fake as never);
    const roster = [rosterEntry("camp_a", "A")];
    const result = await rankSimilarCampaigns(TARGET, roster);
    assert.equal(result.source, "stub");
    assert.equal(captured[0].status, "fallback");
  });
});
