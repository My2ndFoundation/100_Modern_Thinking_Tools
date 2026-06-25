// test/config.test.ts
import { describe, it, expect } from "vitest";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";
import { WIKI_FOLDERS, CREATION_FOLDER, findRootUpwards } from "../src/config";

describe("config", () => {
  it("folder constants", () => {
    expect(WIKI_FOLDERS).toEqual(["工具", "概念", "人物", "著作", "来源"]);
    expect(CREATION_FOLDER).toBe("创作");
  });

  it("findRootUpwards finds the vault", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vault-"));
    const vault = path.join(tmp, "vault");
    fs.mkdirSync(path.join(vault, "工具"), { recursive: true });
    fs.writeFileSync(path.join(vault, "CLAUDE.md"), "x");
    const start = path.join(vault, "_mcp", "pkg", "config.ts");
    fs.mkdirSync(path.dirname(start), { recursive: true });
    fs.writeFileSync(start, "");
    expect(findRootUpwards(start)).toBe(path.resolve(vault));
  });

  it("findRootUpwards returns null when not found", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "novault-"));
    const start = path.join(tmp, "a", "b", "config.ts");
    fs.mkdirSync(path.dirname(start), { recursive: true });
    fs.writeFileSync(start, "");
    expect(findRootUpwards(start)).toBeNull();
  });
});
