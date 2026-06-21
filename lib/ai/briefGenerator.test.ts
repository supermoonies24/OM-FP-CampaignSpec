import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { generateBrief } from "./briefGenerator";
import { resetAnthropicForTests } from "./client";
import { setLoggerForTests, type AiRunRecord } from "./aiRun";
import { STAGES } from "@/lib/workflow/stages";

// Tests the Phase 2a brief generator without touching the real Anthropic API
// or the AiRun table. The Anthropic client is replaced via
// resetAnthropicForTests(); the AiRun logger is replaced via
// setLoggerForTests() so we can assert on what gets logged.

interface FakeMessagesCreate {
  (...args: unknown[]): Promise<unknown>;
}

function makeFakeAnthropic(messagesCreate: FakeMessagesCreate): {
  messages: { create: FakeMessagesCreate };
} {
  return { messages: { create: messagesCreate } };
}

const VALID_PAYLOAD = {
  highLevelJourney: {
    summary: "Test summary",
    touchpoints: [{ name: "Launch", channel: "Email", purpose: "Awareness" }],
  },
  sfmcJourney: {
    name: "Test Journey",
    entrySource: "DE",
    activities: [{ kind: "Email", label: "Launch" }],
  },
  timeline: STAGES.map((s, i) => ({
    stage: s,
    label: s,
    targetOffsetDays: i + 1,
  })),
  specFormDraft: {
    campaignName: "Test",
    brand: "Ford Pro",
    audience: "Fleet buyers",
    campaignType: "Standard",
    numSends: 3,
  },
};

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

describe("generateBrief", () => {
  it("returns AI-generated payload and logs success when the SDK responds", async () => {
    const fake = makeFakeAnthropic(async () => ({
      content: [{ type: "text", text: JSON.stringify(VALID_PAYLOAD) }],
      usage: { input_tokens: 100, output_tokens: 500 },
    }));
    resetAnthropicForTests(fake as never);

    const result = await generateBrief({
      campaignId: "camp_1",
      campaignName: "Test",
      client: "Ford Pro",
      intakeRaw: { summary: "x" },
    });

    assert.equal(result.source, "ai");
    assert.equal(result.payload.highLevelJourney.summary, "Test summary");
    assert.equal(captured.length, 1);
    assert.equal(captured[0].status, "ok");
    assert.equal(captured[0].tokensIn, 100);
    assert.equal(captured[0].tokensOut, 500);
  });

  it("falls back to the stub and logs status='fallback' when the SDK returns malformed JSON", async () => {
    const fake = makeFakeAnthropic(async () => ({
      content: [{ type: "text", text: "not valid json {" }],
      usage: { input_tokens: 50, output_tokens: 10 },
    }));
    resetAnthropicForTests(fake as never);

    const result = await generateBrief({
      campaignName: "Test",
      client: "Ford Pro",
    });

    assert.equal(result.source, "stub");
    // Stub still produces a payload with the same shape
    assert.equal(result.payload.timeline.length, STAGES.length);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].status, "fallback");
  });

  it("falls back to the stub and logs when ANTHROPIC_API_KEY is missing", async () => {
    resetAnthropicForTests(null);

    const result = await generateBrief({
      campaignName: "Test",
      client: "Ford Pro",
    });

    assert.equal(result.source, "stub");
    assert.equal(result.payload.timeline.length, STAGES.length);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].status, "fallback");
    const output = captured[0].output as { error?: string };
    assert.match(output.error ?? "", /ANTHROPIC_API_KEY/);
  });

  it("falls back when validation fails (response missing required field)", async () => {
    const broken = { ...VALID_PAYLOAD, highLevelJourney: undefined };
    const fake = makeFakeAnthropic(async () => ({
      content: [{ type: "text", text: JSON.stringify(broken) }],
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    resetAnthropicForTests(fake as never);

    const result = await generateBrief({
      campaignName: "Test",
      client: "Ford Pro",
    });

    assert.equal(result.source, "stub");
    assert.equal(captured[0].status, "fallback");
  });
});
