// test/server.test.ts
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { makeTools } from "../src/tools";
import { createContext } from "../src/server";
import { saveDraft } from "../src/drafts";
import { createFakeVault } from "./fixtures";

describe("server tools", () => {
  it("exposes exactly the 10 tools", () => {
    process.env.DEDAO_VAULT_ROOT = createFakeVault();
    const ctx = createContext();
    const names = makeTools(ctx).map((t) => t.name);
    expect(new Set(names)).toEqual(new Set([
      "search_pages", "get_page", "get_backlinks", "get_related", "pick_topics",
      "list_columns", "get_column", "save_draft", "list_drafts", "refresh_index",
    ]));
  });

  it("pick_topics excludes written covers", async () => {
    const root = createFakeVault();
    process.env.DEDAO_VAULT_ROOT = root;
    const ctx = createContext();
    saveDraft(path.join(root, "创作"), "uk", "social", "x", "body", ["[[叙事]]"]);
    const pick = makeTools(ctx).find((t) => t.name === "pick_topics")!;
    const out = await pick.handler({ mode: "by_tag", tag: "板块/基本世界观" });
    expect((out as any[]).every((o) => o.name !== "叙事")).toBe(true);
  });

  it("refresh_index reports page count", async () => {
    process.env.DEDAO_VAULT_ROOT = createFakeVault();
    const ctx = createContext();
    const refresh = makeTools(ctx).find((t) => t.name === "refresh_index")!;
    const out = await refresh.handler({});
    expect((out as any).pages_indexed).toBeGreaterThan(0);
  });
});
