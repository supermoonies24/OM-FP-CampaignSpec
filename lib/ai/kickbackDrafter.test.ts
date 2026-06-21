import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { draftKickbackReason } from "./kickbackDrafter";
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

const INPUT = {
  campaignId: "c1",
  fromStage: "CLIENT_STRATEGY_APPROVAL",
  fromStageLabel: "Client Strategy Approval",
  toStage: "STRATEGY_DEVELOPMENT",
  toStageLabel: "Strategy Development",
  recentComments: [
    {
      authorEmail: "lead@om.com",
      body: "Audience definition is too broad — needs to split fleet vs commercial",
      createdAt: new Date("2026-07-01T12:00:00Z"),
    },
  ],
};

describe("draftKickbackReason", () => {
  it("returns AI draft when SDK responds", async () => {
    resetAnthropicForTests({
      messages: {
        create: async () => ({
          content: [{ type: "text", text: JSON.stringify({ reason: "Audience needs to split fleet vs commercial — per @lead." }) }],
          usage: { input_tokens: 40, output_tokens: 12 },
        }),
      },
    } as never);

    const result = await draftKickbackReason(INPUT);
    assert.equal(result.source, "ai");
    assert.match(result.reason, /split fleet vs commercial/);
    assert.equal(captured[0].status, "ok");
  });

  it("falls back to a recent-comment-derived stub on SDK failure", async () => {
    resetAnthropicForTests({ messages: { create: async () => { throw new Error("net"); } } } as never);
    const result = await draftKickbackReason(INPUT);
    assert.equal(result.source, "stub");
    assert.match(result.reason, /Audience definition is too broad/);
    assert.equal(captured[0].status, "fallback");
  });

  it("falls back with a generic message when there are no comments", async () => {
    resetAnthropicForTests(null);
    const result = await draftKickbackReason({ ...INPUT, recentComments: [] });
    assert.equal(result.source, "stub");
    assert.match(result.reason, /Returning to Strategy Development/);
  });
});
