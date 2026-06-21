import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("returns empty string for null/undefined", () => {
    assert.equal(csvCell(null), "");
    assert.equal(csvCell(undefined), "");
  });

  it("passes through plain strings", () => {
    assert.equal(csvCell("hello"), "hello");
  });

  it("quotes strings containing commas, quotes, or newlines", () => {
    assert.equal(csvCell("a,b"), '"a,b"');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
    assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  });

  it("stringifies non-strings", () => {
    assert.equal(csvCell(42), "42");
    assert.equal(csvCell(true), "true");
  });
});

describe("toCsv", () => {
  it("joins headers and rows with CRLF and trailing newline", () => {
    const out = toCsv(["a", "b"], [[1, 2], [3, 4]]);
    assert.equal(out, "a,b\r\n1,2\r\n3,4\r\n");
  });

  it("handles empty rows", () => {
    const out = toCsv(["a"], []);
    assert.equal(out, "a\r\n");
  });
});
