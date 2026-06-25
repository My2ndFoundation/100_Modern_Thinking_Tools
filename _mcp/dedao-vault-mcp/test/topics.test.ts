import { describe, it, expect } from "vitest";
import { createFakeVault } from "./fixtures";
import { buildIndex } from "../src/vaultIndex";
import { pickTopics } from "../src/topics";

describe("topics", () => {
  it("recently_updated order", () => {
    const idx = buildIndex(createFakeVault());
    const out = pickTopics(idx, "recently_updated", "tool");
    expect(out.map((o) => o.name)).toEqual(["认知解耦", "叙事"]);
  });

  it("least_linked first (叙事 has 0 backlinks)", () => {
    const idx = buildIndex(createFakeVault());
    expect(pickTopics(idx, "least_linked", "tool")[0].name).toBe("叙事");
  });

  it("by_tag filters and orders by name", () => {
    const idx = buildIndex(createFakeVault());
    const out = pickTopics(idx, "by_tag", undefined, "板块/基本世界观");
    expect(out.map((o) => o.name)).toEqual(["叙事", "认知解耦"]);
  });

  it("exclude_written removes covered names", () => {
    const idx = buildIndex(createFakeVault());
    const out = pickTopics(idx, "by_tag", undefined, "板块/基本世界观", 5, new Set(["叙事"]));
    expect(out.every((o) => o.name !== "叙事")).toBe(true);
  });

  it("count limits results", () => {
    const idx = buildIndex(createFakeVault());
    const out = pickTopics(idx, "by_tag", undefined, "板块/基本世界观", 1);
    expect(out.length).toBe(1);
    expect(out[0].name).toBe("叙事");
  });

  it("unknown mode throws", () => {
    const idx = buildIndex(createFakeVault());
    expect(() => pickTopics(idx, "nonsense")).toThrow();
  });
});
