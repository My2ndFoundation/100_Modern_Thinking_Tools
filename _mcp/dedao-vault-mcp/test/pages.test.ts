import { describe, it, expect } from "vitest";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseFrontmatter, parseSections, parseLinkTarget,
  extractOutlinks, oneLiner, parsePage,
} from "../src/pages";

const DOC = `---
type: tool
aliases: [Narrative, 叙事法]
tags: [板块/基本世界观]
---

## 一句话定义
对事实的连贯描述。
第二行不算一句话定义。

## 相关工具
- [[叙事权]]
- [[认知解耦|解耦]]
`;

describe("pages", () => {
  it("parseFrontmatter splits fm and body", () => {
    const [fm, body] = parseFrontmatter(DOC);
    expect(fm.type).toBe("tool");
    expect(body.startsWith("## 一句话定义")).toBe(true);
  });

  it("parseSections keys on ## headings", () => {
    const [, body] = parseFrontmatter(DOC);
    const s = parseSections(body);
    expect("一句话定义" in s).toBe(true);
    expect("相关工具" in s).toBe(true);
  });

  it("parseLinkTarget strips alias and heading", () => {
    expect(parseLinkTarget("[[认知解耦|解耦]]")).toBe("认知解耦");
    expect(parseLinkTarget("叙事权#用法")).toBe("叙事权");
  });

  it("extractOutlinks dedup + ordered", () => {
    expect(extractOutlinks(DOC)).toEqual(["叙事权", "认知解耦"]);
  });

  it("oneLiner first line only", () => {
    const [, body] = parseFrontmatter(DOC);
    expect(oneLiner(parseSections(body))).toBe("对事实的连贯描述。");
  });

  it("oneLiner falls back to 简介 then empty", () => {
    expect(oneLiner({ "简介": "首行。\n后续行。" })).toBe("首行。");
    expect(oneLiner({})).toBe("");
  });

  it("parseFrontmatter preserves a body horizontal rule", () => {
    const text = "---\ntype: tool\n---\n\nintro\n\n---\n\nmore\n";
    const [fm, body] = parseFrontmatter(text);
    expect(fm.type).toBe("tool");
    expect(body.includes("intro") && body.includes("more") && body.includes("---")).toBe(true);
  });

  it("parseFrontmatter ignores a non-leading delimiter", () => {
    const text = "----not frontmatter\nbody\n";
    const [fm, body] = parseFrontmatter(text);
    expect(fm).toEqual({});
    expect(body).toBe(text);
  });

  it("parsePage", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p-"));
    const fp = path.join(dir, "叙事.md");
    fs.writeFileSync(fp, DOC, "utf-8");
    const page = parsePage(fp);
    expect(page.name).toBe("叙事");
    expect(page.type).toBe("tool");
    expect(page.aliases).toContain("Narrative");
    expect(page.tags).toContain("板块/基本世界观");
    expect(page.outlinks).toEqual(["叙事权", "认知解耦"]);
  });
});
