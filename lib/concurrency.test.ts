import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("preserves result order", async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 10);
    assert.deepEqual(result, [10, 20, 30, 40, 50]);
  });

  it("never exceeds the concurrency limit in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 12 }, (_, i) => i), 3, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
    });
    assert.ok(peak <= 3, `peak in-flight was ${peak}`);
  });

  it("handles empty input", async () => {
    const result = await mapWithConcurrency<number, number>([], 4, async (n) => n);
    assert.deepEqual(result, []);
  });

  it("handles limit greater than item count", async () => {
    const result = await mapWithConcurrency([1, 2], 10, async (n) => n + 1);
    assert.deepEqual(result, [2, 3]);
  });
});
