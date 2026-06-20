import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreRisk } from "./risk";

const today = new Date("2026-06-20T12:00:00Z");
const daysFromNow = (d: number) => {
  const out = new Date(today);
  out.setDate(out.getDate() + d);
  return out;
};

describe("scoreRisk", () => {
  it("marks a closed item as complete and on-time when actual <= target", () => {
    const r = scoreRisk(
      { stage: "INTAKE", targetDate: daysFromNow(2), actualDate: daysFromNow(1) },
      today,
    );
    assert.equal(r.status, "complete");
    assert.equal(r.riskScore, 0);
    assert.match(r.riskReason, /on or before/);
  });

  it("marks a closed item as complete-but-late when actual > target", () => {
    const r = scoreRisk(
      { stage: "INTAKE", targetDate: daysFromNow(-2), actualDate: daysFromNow(1) },
      today,
    );
    assert.equal(r.status, "complete");
    assert.match(r.riskReason, /after target/);
  });

  it("marks an open item past target as late with score 1", () => {
    const r = scoreRisk(
      { stage: "INTAKE", targetDate: daysFromNow(-3), actualDate: null },
      today,
    );
    assert.equal(r.status, "late");
    assert.equal(r.riskScore, 1);
  });

  it("marks an open item due today as atRisk", () => {
    const r = scoreRisk(
      { stage: "INTAKE", targetDate: today, actualDate: null },
      today,
    );
    assert.equal(r.status, "atRisk");
    assert.ok(r.riskScore >= 0.85);
  });

  it("marks an open item within 25% of its SLA window as atRisk", () => {
    // CREATIVE_DESIGN_AND_COPY has slaDays=5, so quarter=2. 1 day remaining = at risk.
    const r = scoreRisk(
      { stage: "CREATIVE_DESIGN_AND_COPY", targetDate: daysFromNow(1), actualDate: null },
      today,
    );
    assert.equal(r.status, "atRisk");
  });

  it("marks an open item with plenty of runway as onTrack", () => {
    const r = scoreRisk(
      { stage: "CREATIVE_DESIGN_AND_COPY", targetDate: daysFromNow(5), actualDate: null },
      today,
    );
    assert.equal(r.status, "onTrack");
    assert.ok(r.riskScore < 0.5);
  });
});
