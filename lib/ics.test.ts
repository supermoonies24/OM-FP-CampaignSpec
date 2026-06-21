import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addDaysUtc, dateOnlyUtc, toIcs } from "./ics";

describe("dateOnlyUtc + addDaysUtc", () => {
  it("formats date as yyyymmdd in UTC", () => {
    const d = new Date(Date.UTC(2026, 6, 1, 12, 0, 0));
    assert.equal(dateOnlyUtc(d), "20260701");
  });

  it("addDaysUtc rolls month boundaries correctly", () => {
    const d = new Date(Date.UTC(2026, 6, 31, 0, 0, 0));
    assert.equal(dateOnlyUtc(addDaysUtc(d, 1)), "20260801");
  });
});

describe("toIcs", () => {
  it("emits VCALENDAR wrapper with required headers", () => {
    const out = toIcs([], { calendarName: "Test" });
    assert.match(out, /^BEGIN:VCALENDAR/);
    assert.match(out, /VERSION:2\.0/);
    assert.match(out, /END:VCALENDAR/);
    assert.match(out, /X-WR-CALNAME:Test/);
  });

  it("renders one VEVENT per event with all-day DTSTART when no time component", () => {
    const out = toIcs(
      [{ uid: "evt-1", summary: "Stage A", startDate: "20260701", endDate: "20260702" }],
      { calendarName: "Test" },
    );
    assert.match(out, /BEGIN:VEVENT/);
    assert.match(out, /UID:evt-1/);
    assert.match(out, /DTSTART;VALUE=DATE:20260701/);
    assert.match(out, /DTEND;VALUE=DATE:20260702/);
    assert.match(out, /SUMMARY:Stage A/);
    assert.match(out, /END:VEVENT/);
  });

  it("escapes commas, semicolons, and newlines in text", () => {
    const out = toIcs(
      [{ uid: "x", summary: "Hi, world; line1\nline2", startDate: "20260701" }],
      { calendarName: "T" },
    );
    assert.match(out, /SUMMARY:Hi\\, world\\; line1\\nline2/);
  });

  it("folds long lines at 73 chars per VEVENT field", () => {
    const longSummary = "x".repeat(200);
    const out = toIcs([{ uid: "x", summary: longSummary, startDate: "20260701" }], { calendarName: "T" });
    // Fold introduces "\r\n " continuation; just check there's at least one.
    assert.match(out, /\r\n /);
  });
});
