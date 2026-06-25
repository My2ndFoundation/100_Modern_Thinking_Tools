import { describe, it, expect } from "vitest";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadColumns, listColumns, getColumn } from "../src/columns";

const YAML_TEXT = `columns:
  - id: thinking-tools-uk
    name: Thinking Tools (UK)
    format: social
    language: en-GB
    topic_mode: rotation
  - id: daily-tool-zh
    name: 每日一个思维工具
    format: social
    language: zh
    topic_mode: rotation
`;

function seed(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cols-"));
  const c = path.join(tmp, "创作");
  fs.mkdirSync(c, { recursive: true });
  fs.writeFileSync(path.join(c, "_栏目.yaml"), YAML_TEXT, "utf-8");
  return c;
}

describe("columns", () => {
  it("loadColumns", () => {
    const cols = loadColumns(seed()) as any[];
    expect(cols.map((c) => c.id)).toEqual(["thinking-tools-uk", "daily-tool-zh"]);
  });

  it("listColumns summary keys", () => {
    const s = (listColumns(seed()) as any[])[0];
    expect(new Set(Object.keys(s))).toEqual(new Set(["id", "name", "format", "language", "topic_mode"]));
  });

  it("getColumn found and missing", () => {
    const c = seed();
    expect((getColumn(c, "daily-tool-zh") as any).language).toBe("zh");
    const miss = getColumn(c, "nope") as any;
    expect(miss.error).toBe("column_not_found");
    expect(miss.available).toContain("thinking-tools-uk");
  });

  it("missing file", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cols-"));
    const c = path.join(tmp, "创作");
    fs.mkdirSync(c, { recursive: true });
    expect((loadColumns(c) as any).error).toBe("columns_file_missing");
  });

  it("yaml_error", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cols-"));
    const c = path.join(tmp, "创作");
    fs.mkdirSync(c, { recursive: true });
    fs.writeFileSync(path.join(c, "_栏目.yaml"), "columns: [1, 2", "utf-8");
    expect((loadColumns(c) as any).error).toBe("yaml_error");
  });

  it("list/get pass error through", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cols-"));
    const c = path.join(tmp, "创作");
    fs.mkdirSync(c, { recursive: true });
    expect((listColumns(c) as any).error).toBe("columns_file_missing");
    expect((getColumn(c, "x") as any).error).toBe("columns_file_missing");
  });
});
