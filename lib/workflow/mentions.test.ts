import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMentions } from "./mentions";
import { CHANNELS } from "./channels";

describe("parseMentions", () => {
  it("returns empty for plain text", () => {
    const r = parseMentions("just a normal comment");
    assert.deepEqual(r, { channels: [], all: false });
  });

  it("matches the canonical channel name case-insensitively", () => {
    const r = parseMentions("hey @Strategy please review");
    assert.deepEqual(r.channels, ["STRATEGY"]);
    assert.equal(r.all, false);
  });

  it("normalizes common spellings to the enum", () => {
    const r = parseMentions("@dev-ops can you ship? @fordpro fyi");
    assert.equal(r.channels.includes("DEV_OPS"), true);
    assert.equal(r.channels.includes("FORD_PRO"), true);
  });

  it("@here returns every channel and sets all:true", () => {
    const r = parseMentions("@here meeting in 5");
    assert.equal(r.all, true);
    assert.equal(r.channels.length, CHANNELS.length);
  });

  it("ignores unknown tokens", () => {
    const r = parseMentions("@randomperson said hi");
    assert.deepEqual(r.channels, []);
    assert.equal(r.all, false);
  });

  it("dedupes repeated mentions", () => {
    const r = parseMentions("@strategy and @STRATEGY both");
    assert.deepEqual(r.channels, ["STRATEGY"]);
  });
});
