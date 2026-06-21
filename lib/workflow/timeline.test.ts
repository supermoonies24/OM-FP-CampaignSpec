import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Smoke test: imports compile and the module exports the expected shape.
// Full DB-backed integration tests would require a real Prisma test harness;
// for now we keep this pure-shape so the test runner stays hermetic.
import { syncBriefTimeline } from "./timeline";

describe("syncBriefTimeline (shape)", () => {
  it("exports an async function taking the documented input", () => {
    assert.equal(typeof syncBriefTimeline, "function");
    // syncBriefTimeline is async — its result must be a Promise.
    // We don't call it here (would hit Prisma); just verify the signature.
    assert.equal(syncBriefTimeline.length, 1);
  });
});
