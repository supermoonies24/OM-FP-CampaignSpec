import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planTransition } from "./transitions";

describe("planTransition", () => {
  it("advances exactly one stage forward", () => {
    const r = planTransition({ from: "INTAKE", to: "OM_ALIGNMENT" });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.to, "OM_ALIGNMENT");
      assert.ok(Array.isArray(r.entryActions));
    }
  });

  it("rejects forward jumps that skip stages", () => {
    const r = planTransition({ from: "INTAKE", to: "STRATEGY_DEVELOPMENT" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /skip stages/);
  });

  it("allows backward kick-back to any prior stage", () => {
    const r = planTransition({ from: "CREATIVE_DESIGN_AND_COPY", to: "OM_ALIGNMENT" });
    assert.equal(r.ok, true);
  });

  it("rejects self-transition", () => {
    const r = planTransition({ from: "INTAKE", to: "INTAKE" });
    assert.equal(r.ok, false);
  });

  it("rejects unknown stages", () => {
    const r = planTransition({ from: "INTAKE", to: "MADE_UP" as never });
    assert.equal(r.ok, false);
  });

  it("blocks signoff gate without an approval from the owner channel", () => {
    // CLIENT_STRATEGY_APPROVAL is a signoff gate owned by FORD_PRO; advancing
    // out without a FORD_PRO approval should fail.
    const r = planTransition({
      from: "CLIENT_STRATEGY_APPROVAL",
      to: "CREATIVE_BRIEF",
      approvalsForFromStage: [],
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /signoff/);
  });

  it("clears signoff gate when an approval from the owner channel exists", () => {
    const r = planTransition({
      from: "CLIENT_STRATEGY_APPROVAL",
      to: "CREATIVE_BRIEF",
      approvalsForFromStage: [{ channel: "FORD_PRO" }],
    });
    assert.equal(r.ok, true);
  });

  it("does not enforce the gate on backward moves", () => {
    // Going BACK from CLIENT_STRATEGY_APPROVAL should not require its signoff.
    const r = planTransition({
      from: "CLIENT_STRATEGY_APPROVAL",
      to: "STRATEGY_DEVELOPMENT",
    });
    assert.equal(r.ok, true);
  });

  it("can bypass gate when enforceGate=false", () => {
    const r = planTransition({
      from: "CLIENT_STRATEGY_APPROVAL",
      to: "CREATIVE_BRIEF",
      enforceGate: false,
    });
    assert.equal(r.ok, true);
  });
});
