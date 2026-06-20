import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBriefStub } from "./briefStub";
import { STAGES } from "./stages";

describe("buildBriefStub", () => {
  it("returns the four BriefDeckPayload sections", () => {
    const b = buildBriefStub({ campaignName: "Test", client: "Ford Pro" });
    assert.ok(b.highLevelJourney);
    assert.ok(b.sfmcJourney);
    assert.ok(b.timeline);
    assert.ok(b.specFormDraft);
  });

  it("produces a timeline entry per stage", () => {
    const b = buildBriefStub({ campaignName: "Test", client: "Ford Pro" });
    assert.equal(b.timeline.length, STAGES.length);
    // targetOffsetDays should be strictly increasing
    for (let i = 1; i < b.timeline.length; i++) {
      assert.ok(b.timeline[i].targetOffsetDays > b.timeline[i - 1].targetOffsetDays);
    }
  });

  it("incorporates intake summary, objective, and audience when provided", () => {
    const b = buildBriefStub({
      campaignName: "Q3 launch",
      client: "Ford Pro",
      intakeRaw: { summary: "Big push for Super Duty", objective: "Test drives", audience: "Owners" },
    });
    assert.match(b.highLevelJourney.summary, /Super Duty/);
    assert.match(b.highLevelJourney.summary, /Test drives/);
    assert.equal(b.specFormDraft.audience, "Owners");
  });

  it("falls back to sane defaults when intake is missing", () => {
    const b = buildBriefStub({ campaignName: "Test", client: "Ford Pro" });
    assert.match(b.highLevelJourney.summary, /Test/);
    assert.ok(typeof b.specFormDraft.audience === "string");
  });

  it("names the SFMC journey after the campaign", () => {
    const b = buildBriefStub({ campaignName: "Hello", client: "Ford Pro" });
    assert.equal(b.sfmcJourney.name, "Hello Journey");
  });
});
