import { describe, it, expect } from "vitest";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";
import { slugify, saveDraft, listDrafts } from "../src/drafts";

function creation(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dr-"));
  const c = path.join(tmp, "创作");
  fs.mkdirSync(c, { recursive: true });
  return c;
}

describe("drafts", () => {
  it("slugify", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
    expect(slugify("叙事 的力量")).toBe("叙事-的力量");
  });

  it("saveDraft writes file with frontmatter + covers", () => {
    const c = creation();
    const res = saveDraft(c, "uk", "social", "Narrative power", "Body text.", ["[[叙事]]"], "en-GB", "2026-06-24") as any;
    expect(res.status).toBe("saved");
    const text = fs.readFileSync(path.join(c, "uk", "2026-06-24-narrative-power.md"), "utf-8");
    expect(text.includes("type: draft")).toBe(true);
    expect(text.includes("language: en-GB")).toBe(true);
    expect(text.includes("[[叙事]]")).toBe(true);
    expect(text.includes("## 用到的知识库页面")).toBe(true);
  });

  it("saveDraft rejects traversal / empty / dot column", () => {
    const c = creation();
    expect((saveDraft(c, "../工具", "social", "x", "b", [], undefined, "2026-06-24") as any).error).toBe("path_rejected");
    expect((saveDraft(c, "", "social", "x", "b", [], undefined, "2026-06-24") as any).error).toBe("path_rejected");
    expect((saveDraft(c, ".", "social", "x", "b", [], undefined, "2026-06-24") as any).error).toBe("path_rejected");
  });

  it("listDrafts newest first", () => {
    const c = creation();
    saveDraft(c, "uk", "social", "Old", "x", ["[[叙事]]"], undefined, "2026-06-01");
    saveDraft(c, "uk", "social", "New", "x", ["[[认知解耦]]"], undefined, "2026-06-20");
    const drafts = listDrafts(c);
    expect(drafts[0].created).toBe("2026-06-20");
    expect(drafts[0].covers).toEqual(["[[认知解耦]]"]);
  });

  it("listDrafts skips _ column and rejects traversal column", () => {
    const c = creation();
    saveDraft(c, "uk", "social", "X", "b", ["[[叙事]]"], undefined, "2026-06-20");
    expect(listDrafts(c, "_prompts")).toEqual([]);
    const tmpRoot = path.dirname(c);
    fs.mkdirSync(path.join(tmpRoot, "工具"), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, "工具", "secret.md"), "---\ncolumn: x\n---\nbody\n", "utf-8");
    expect(listDrafts(c, "../工具")).toEqual([]);
  });
});
