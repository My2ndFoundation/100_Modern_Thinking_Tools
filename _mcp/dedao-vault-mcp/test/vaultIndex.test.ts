// test/vaultIndex.test.ts
import { describe, it, expect } from "vitest";
import { createFakeVault } from "./fixtures";
import {
  buildIndex, resolve, search, pageView, backlinksView, relatedView,
} from "../src/vaultIndex";

describe("vaultIndex", () => {
  it("buildIndex skips broken pages and indexes the rest", () => {
    const idx = buildIndex(createFakeVault());
    expect(idx.pages.has("叙事")).toBe(true);
    expect(idx.pages.has("认知解耦")).toBe(true);
    expect(idx.pages.has("万维钢")).toBe(true);
    expect(idx.pages.has("坏页")).toBe(false);
    expect(idx.warnings.some((w) => w.includes("坏页"))).toBe(true);
  });

  it("resolve by alias and exact name", () => {
    const idx = buildIndex(createFakeVault());
    expect(resolve(idx, "Narrative")).toBe("叙事");
    expect(resolve(idx, "叙事")).toBe("叙事");
    expect(resolve(idx, "不存在")).toBeNull();
  });

  it("search ranks title over body and is descending", () => {
    const idx = buildIndex(createFakeVault());
    const hits = search(idx, "叙事");
    expect(hits[0].name).toBe("叙事");
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[hits.length - 1].score);
  });

  it("search type filter", () => {
    const idx = buildIndex(createFakeVault());
    expect(search(idx, "叙事", "person").every((h) => h.type === "person")).toBe(true);
  });

  it("pageView not_found returns suggestions array", () => {
    const idx = buildIndex(createFakeVault());
    const out = pageView(idx, "叙事x") as any;
    expect(out.error).toBe("not_found");
    expect(Array.isArray(out.suggestions)).toBe(true);
  });

  it("backlinks include section and source links", () => {
    const idx = buildIndex(createFakeVault());
    const names = new Set((backlinksView(idx, "认知解耦") as any[]).map((b) => b.name));
    expect(names.has("叙事")).toBe(true);
    expect(names.has("叙事这节课")).toBe(true);
  });

  it("related includes section/co-citation", () => {
    const idx = buildIndex(createFakeVault());
    const rel = Object.fromEntries((relatedView(idx, "叙事") as any[]).map((r) => [r.name, r.reason]));
    expect("认知解耦" in rel).toBe(true);
  });
});
