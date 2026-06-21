import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { scoreRiskAi } from "./riskScorer";
import { resetAnthropicForTests } from "./client";
import { setLoggerForTests, type AiRunRecord } from "./aiRun";

// Tests scoreRiskAi without touching the real Anthropic API or the AiRun
// table. Same harness pattern as briefGenerator.test.ts.

let captured: AiRunRecord[] = [];
let restoreLogger: () => void;

beforeEach(() => {
  captured = [];
  restoreLogger = setLoggerForTests(async (r) => {
    captured.push(r);
  });
});

afterEach(() => {
  restoreLogger();
  resetAnthropicForTests(null);
});

const SCORED_AT = new Date("2026-07-01T12:00:00Z");

describe("scoreRiskAi", () => {
  it("returns the AI verdict when the model responds with a valid payload", async () => {
    const fake = {
      messages: {
        create: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "atRisk", riskScore: 0.72, riskReason: "Two days remaining" }),
            },
          ],
          usage: { input_tokens: 120, output_tokens: 30 },
        }),
      },
    };
    resetAnthropicForTests(fake as never);

    const out = await scoreRiskAi(
      {
        campaignId: "camp_1",
        campaignName: "Test",
        stage: "STRATEGY_DEVELOPMENT",
        targetDate: new Date("2026-07-03T12:00:00Z"),
        actualDate: null,
        approvalsForStage: 0,
      },
      { scoredAt: SCORED_AT },
    );

    assert.equal(out.status, "atRisk");
    assert.equal(out.riskScore, 0.72);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].status, "ok");
    assert.equal(captured[0].tokensIn, 120);
  });

  it("uses the deterministic baseline (no API call) for closed items", async () => {
    let called = false;
    const fake = {
      messages: {
        create: async () => {
          called = true;
          return { content: [], usage: {} };
        },
      },
    };
    resetAnthropicForTests(fake as never);

    const out = await scoreRiskAi(
      {
        campaignId: "camp_1",
        campaignName: "Test",
        stage: "STRATEGY_DEVELOPMENT",
        targetDate: new Date("2026-06-01T12:00:00Z"),
        actualDate: new Date("2026-06-01T12:00:00Z"),
      },
      { scoredAt: SCORED_AT },
    );

    assert.equal(called, false);
    assert.equal(out.status, "complete");
    assert.equal(captured.length, 0);
  });

  it("falls back to deterministic when SDK throws", async () => {
    const fake = {
      messages: {
        create: async () => {
          throw new Error("network down");
        },
      },
    };
    resetAnthropicForTests(fake as never);

    const out = await scoreRiskAi(
      {
        campaignId: "camp_1",
        campaignName: "Test",
        stage: "STRATEGY_DEVELOPMENT",
        targetDate: new Date("2026-06-15T12:00:00Z"),
        actualDate: null,
      },
      { scoredAt: SCORED_AT },
    );

    // Past target → deterministic returns "late"
    assert.equal(out.status, "late");
    assert.equal(out.riskScore, 1);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].status, "fallback");
  });

  it("falls back when ANTHROPIC_API_KEY is missing", async () => {
    resetAnthropicForTests(null);

    const out = await scoreRiskAi(
      {
        campaignId: "camp_1",
        campaignName: "Test",
        stage: "STRATEGY_DEVELOPMENT",
        targetDate: new Date("2026-07-05T12:00:00Z"),
        actualDate: null,
      },
      { scoredAt: SCORED_AT },
    );

    assert.equal(captured.length, 1);
    assert.equal(captured[0].status, "fallback");
    // 4 days to target on a 3-day SLA stage → onTrack per deterministic
    assert.equal(out.status, "onTrack");
  });

  it("falls back when response status is invalid", async () => {
    const fake = {
      messages: {
        create: async () => ({
          content: [{ type: "text", text: JSON.stringify({ status: "boom", riskScore: 0.5, riskReason: "x" }) }],
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      },
    };
    resetAnthropicForTests(fake as never);

    const out = await scoreRiskAi(
      {
        campaignId: "camp_1",
        campaignName: "Test",
        stage: "STRATEGY_DEVELOPMENT",
        targetDate: new Date("2026-07-10T12:00:00Z"),
        actualDate: null,
      },
      { scoredAt: SCORED_AT },
    );

    assert.equal(captured[0].status, "fallback");
    assert.ok(["onTrack", "atRisk", "late"].includes(out.status));
  });
});
