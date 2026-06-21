import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { clarifyIntakeFromData } from "./intakeClarifier";
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

const SPARSE_INTAKE = { summary: "TBD" };
const FULL_INTAKE = {
  summary: "Super Duty awareness push for Q3",
  objective: "Drive test drive sign-ups",
  audience: "Fleet buyers in Texas and Florida",
  campaignType: "Standard",
};

describe("clarifyIntakeFromData", () => {
  it("returns source='skipped' when the intake is comprehensive", async () => {
    resetAnthropicForTests(null);
    const result = await clarifyIntakeFromData({
      campaignId: "c1",
      campaignName: "Test",
      client: "Ford Pro",
      intake: FULL_INTAKE,
    });
    assert.deepEqual(result, { questions: [], source: "skipped" });
    assert.equal(captured.length, 0);
  });

  it("returns AI questions when SDK responds with a valid payload on a sparse intake", async () => {
    const fake = {
      messages: {
        create: async () => ({
          content: [{
            type: "text",
            text: JSON.stringify({
              questions: [
                { question: "Who is the primary audience?", reason: "Drives DE selection.", field: "audience" },
                { question: "What is the business objective?", reason: "Shapes CTA.", field: "objective" },
              ],
            }),
          }],
          usage: { input_tokens: 80, output_tokens: 25 },
        }),
      },
    };
    resetAnthropicForTests(fake as never);

    const result = await clarifyIntakeFromData({
      campaignId: "c1",
      campaignName: "Test",
      client: "Ford Pro",
      intake: SPARSE_INTAKE,
    });
    assert.equal(result.source, "ai");
    assert.equal(result.questions.length, 2);
    assert.equal(result.questions[0].field, "audience");
    assert.equal(captured.length, 1);
    assert.equal(captured[0].status, "ok");
  });

  it("falls back to the default checklist when the SDK throws on a sparse intake", async () => {
    const fake = { messages: { create: async () => { throw new Error("network"); } } };
    resetAnthropicForTests(fake as never);

    const result = await clarifyIntakeFromData({
      campaignId: "c1",
      campaignName: "Test",
      client: "Ford Pro",
      intake: SPARSE_INTAKE,
    });
    assert.equal(result.source, "stub");
    assert.equal(result.questions.length, 3);
    assert.equal(captured[0].status, "fallback");
  });

  it("falls back when API key missing", async () => {
    resetAnthropicForTests(null);
    const result = await clarifyIntakeFromData({
      campaignId: "c1",
      campaignName: "Test",
      client: "Ford Pro",
      intake: SPARSE_INTAKE,
    });
    assert.equal(result.source, "stub");
    assert.equal(captured[0].status, "fallback");
  });
});
