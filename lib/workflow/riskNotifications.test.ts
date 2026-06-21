import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { maybeFireRiskAlert } from "./riskNotifications";

// Pure assertion of the edge-trigger gate — doesn't actually hit prisma.
// The function delegates to prisma.workflowNotification.create only when the
// gate passes, so we exercise the no-fire paths here. Real DB-backed tests
// belong in an integration suite.

describe("maybeFireRiskAlert (edge gate)", () => {
  it("returns fired:false when severity does not increase", async () => {
    const res = await maybeFireRiskAlert({
      campaignId: "x",
      campaignName: "x",
      stage: "INTAKE",
      timelineItemId: "t",
      previousStatus: "atRisk",
      outcome: { status: "atRisk", riskScore: 0.7, riskReason: "still at risk" },
    });
    assert.deepEqual(res, { fired: false });
  });

  it("returns fired:false when severity decreases", async () => {
    const res = await maybeFireRiskAlert({
      campaignId: "x",
      campaignName: "x",
      stage: "INTAKE",
      timelineItemId: "t",
      previousStatus: "late",
      outcome: { status: "atRisk", riskScore: 0.7, riskReason: "improved" },
    });
    assert.deepEqual(res, { fired: false });
  });

  it("returns fired:false when staying onTrack", async () => {
    const res = await maybeFireRiskAlert({
      campaignId: "x",
      campaignName: "x",
      stage: "INTAKE",
      timelineItemId: "t",
      previousStatus: "onTrack",
      outcome: { status: "onTrack", riskScore: 0.1, riskReason: "good" },
    });
    assert.deepEqual(res, { fired: false });
  });
});
