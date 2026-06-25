# DeDao Vault Content-Creation MCP — TypeScript Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Python `dedao-vault-mcp` with a behaviourally-identical **TypeScript** MCP server (bun runtime, vitest tests), keeping the `创作/` column config + prompts unchanged.

**Architecture:** Same in-memory index over five wiki folders, exposed as 10 stdio MCP tools via `@modelcontextprotocol/sdk`'s `McpServer`. Tool *logic* lives in `src/tools.ts` (`makeTools(ctx)` → array of `{name,title,description,inputSchema,handler}`), and `src/server.ts` is thin wiring that registers each and wraps results as text content. Writes confined to `创作/`; reads confined to wiki + `创作/`.

**Tech Stack:** TypeScript (ESM), bun (runtime + package manager, runs `.ts` directly — no build step), vitest, `@modelcontextprotocol/sdk`, `zod`, `yaml`.

## Global Constraints

- Runtime: **bun**. No tsc build — bun executes `src/server.ts` directly. tsc used only for `typecheck` (`tsc --noEmit`).
- Tests: **vitest**, run with `bunx vitest run` from `_mcp/dedao-vault-mcp/`. (If vitest cannot run under bun, that is a Task 1 blocker — report it; do not silently switch frameworks.)
- Dependencies: `@modelcontextprotocol/sdk` (latest 1.x), `zod@^3.23.8`, `yaml@^2`. Dev: `vitest@^2`, `typescript@^5`, `@types/node@^20`.
- `package.json` has `"type": "module"`. Relative imports are **extensionless** (`./pages`) — resolved by bun + vitest (`moduleResolution: "bundler"`). SDK subpath imports keep `.js` (`@modelcontextprotocol/sdk/server/mcp.js`).
- **Replace the Python implementation**: `git rm -r` the existing `_mcp/dedao-vault-mcp/` contents in Task 1; the TS package occupies the same path.
- **Do NOT modify** `创作/_栏目.yaml`, `创作/_prompts/*.md`, `创作/README.md` (implementation-agnostic, already correct). Only `_mcp/dedao-vault-mcp/README.md` changes (bun wiring).
- **Never** write outside `创作/`; never modify `工具/ 概念/ 人物/ 著作/ 来源/` or `raw/`.
- Every core function takes an explicit `root`/`creationRoot` string; only `config.resolveRoot()` and `server.ts` touch the real vault location.
- Wiki folders, scan order: `工具 概念 人物 著作 来源`. Creation folder: `创作`.
- All 10 tools return JSON-serialisable values; the server wraps each as `{content:[{type:"text",text:JSON.stringify(result)}]}`.
- Path confinement (`safeDir`): reject when `path.relative(root,target)` is `""`, starts with `..`, or is absolute.
- TDD: write the failing test first; commit after each green task. End every commit body with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Branch: `feat/content-creation-mcp-ts`.

---

### Task 1: Scaffold TS package (remove Python) + config

**Files:**
- Delete: all of `_mcp/dedao-vault-mcp/` (Python)
- Create: `_mcp/dedao-vault-mcp/package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `_mcp/dedao-vault-mcp/src/config.ts`
- Test: `_mcp/dedao-vault-mcp/test/config.test.ts`

**Interfaces:**
- Produces: `WIKI_FOLDERS: string[]`, `CREATION_FOLDER: string`, `findRootUpwards(start: string): string | null`, `resolveRoot(): string` (env `DEDAO_VAULT_ROOT` → else walk up from `import.meta.url` to a dir with `CLAUDE.md` + `工具/`).

- [ ] **Step 1: Remove the Python implementation**

Run: `git rm -r "_mcp/dedao-vault-mcp"`
Expected: all Python files staged for deletion. (The new TS files below recreate the directory.)

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "dedao-vault-mcp",
  "version": "0.1.0",
  "type": "module",
  "bin": { "dedao-vault-mcp": "src/server.ts" },
  "scripts": {
    "start": "bun run src/server.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "yaml": "^2.5.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
*.log
```

- [ ] **Step 6: Install deps**

Run: `bun install`
Expected: deps resolve; a `bun.lock` (or `bun.lockb`) is created.

- [ ] **Step 7: Write the failing test**

```ts
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
```

- [ ] **Step 8: Run test to verify it fails**

Run: `bunx vitest run test/config.test.ts`
Expected: FAIL — cannot resolve `../src/config`.
(If vitest itself errors under bun rather than reporting a failing test, STOP and report — this is a tooling blocker.)

- [ ] **Step 9: Implement `src/config.ts`**

```ts
// src/config.ts
import { env } from "node:process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

export const WIKI_FOLDERS = ["工具", "概念", "人物", "著作", "来源"];
export const CREATION_FOLDER = "创作";

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function findRootUpwards(start: string): string | null {
  let dir = path.dirname(path.resolve(start));
  while (true) {
    if (fs.existsSync(path.join(dir, "CLAUDE.md")) && isDir(path.join(dir, "工具"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function resolveRoot(): string {
  const e = env.DEDAO_VAULT_ROOT;
  if (e) {
    const expanded = e.startsWith("~") ? path.join(os.homedir(), e.slice(1)) : e;
    return path.resolve(expanded);
  }
  const found = findRootUpwards(fileURLToPath(import.meta.url));
  if (found) return found;
  throw new Error("Cannot locate vault root; set DEDAO_VAULT_ROOT");
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `bunx vitest run test/config.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 11: Commit**

```bash
git add -A _mcp/dedao-vault-mcp
git commit -m "feat(mcp): scaffold TypeScript dedao-vault-mcp (bun/vitest) + config, remove Python"
```

---

### Task 2: Page parsing (`src/pages.ts`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/src/pages.ts`
- Test: `_mcp/dedao-vault-mcp/test/pages.test.ts`

**Interfaces:**
- Produces: `Page` interface (`name, path, type, aliases, tags, frontmatter, sections, body, outlinks`); `WIKILINK_RE`; `parseFrontmatter(text): [Record<string,any>, string]`; `parseSections(body): Record<string,string>`; `parseLinkTarget(raw): string`; `extractOutlinks(body): string[]`; `oneLiner(sections): string`; `parsePage(filePath): Page` (may throw on bad YAML).

- [ ] **Step 1: Write the failing test**

```ts
// test/pages.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/pages.test.ts`
Expected: FAIL — cannot resolve `../src/pages`.

- [ ] **Step 3: Implement `src/pages.ts`**

```ts
// src/pages.ts
import * as fs from "node:fs";
import * as path from "node:path";
import * as YAML from "yaml";

export interface Page {
  name: string;
  path: string;
  type: string | null;
  aliases: string[];
  tags: string[];
  frontmatter: Record<string, any>;
  sections: Record<string, string>;
  body: string;
  outlinks: string[];
}

export const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

function splitN(s: string, sep: string, n: number): string[] {
  const out: string[] = [];
  let rest = s;
  for (let i = 0; i < n - 1; i++) {
    const idx = rest.indexOf(sep);
    if (idx === -1) break;
    out.push(rest.slice(0, idx));
    rest = rest.slice(idx + sep.length);
  }
  out.push(rest);
  return out;
}

export function parseFrontmatter(text: string): [Record<string, any>, string] {
  if (text.startsWith("---\n")) {
    const parts = splitN(text, "---", 3);
    if (parts.length >= 3) {
      let fm: any = YAML.parse(parts[1]) ?? {};
      if (typeof fm !== "object" || Array.isArray(fm)) fm = {};
      return [fm, parts[2].replace(/^\n+/, "")];
    }
  }
  return [{}, text];
}

export function parseSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  for (const line of body.split("\n")) {
    if (line.startsWith("## ")) {
      if (current !== null) sections[current] = buf.join("\n").trim();
      current = line.slice(3).trim();
      buf = [];
    } else if (current !== null) {
      buf.push(line);
    }
  }
  if (current !== null) sections[current] = buf.join("\n").trim();
  return sections;
}

export function parseLinkTarget(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("[[") && s.endsWith("]]")) s = s.slice(2, -2);
  s = s.split("|")[0];
  s = s.split("#")[0];
  return s.trim();
}

export function extractOutlinks(body: string): string[] {
  const seen: string[] = [];
  for (const m of body.matchAll(WIKILINK_RE)) {
    const target = parseLinkTarget(m[1]);
    if (target && !seen.includes(target)) seen.push(target);
  }
  return seen;
}

export function oneLiner(sections: Record<string, string>): string {
  for (const key of ["一句话定义", "简介"]) {
    const text = (sections[key] ?? "").trim();
    if (text) return text.split("\n")[0].trim();
  }
  return "";
}

export function parsePage(filePath: string): Page {
  const text = fs.readFileSync(filePath, "utf-8");
  const [fm, body] = parseFrontmatter(text);
  const aliases = Array.isArray(fm.aliases) ? fm.aliases.filter((a: any) => typeof a === "string") : [];
  const tags = Array.isArray(fm.tags) ? fm.tags.filter((t: any) => typeof t === "string") : [];
  return {
    name: path.basename(filePath, ".md"),
    path: filePath,
    type: typeof fm.type === "string" ? fm.type : null,
    aliases,
    tags,
    frontmatter: fm,
    sections: parseSections(body),
    body,
    outlinks: extractOutlinks(body),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/pages.test.ts`
Expected: PASS (9 passed).

- [ ] **Step 5: Commit**

```bash
git add _mcp/dedao-vault-mcp/src/pages.ts _mcp/dedao-vault-mcp/test/pages.test.ts
git commit -m "feat(mcp): page parsing (frontmatter, sections, wikilinks)"
```

---

### Task 3: Vault index + retrieval (`src/vaultIndex.ts`) + shared fixture

**Files:**
- Create: `_mcp/dedao-vault-mcp/src/vaultIndex.ts`
- Create: `_mcp/dedao-vault-mcp/test/fixtures.ts`
- Test: `_mcp/dedao-vault-mcp/test/vaultIndex.test.ts`

**Interfaces:**
- Consumes: `pages.*`, `config.WIKI_FOLDERS`.
- Produces: `VaultIndex` (`pages: Map<string,Page>`, `aliasIndex: Map<string,string>`, `backlinks: Map<string,Set<string>>`, `warnings: string[]`); `buildIndex(root): VaultIndex`; `resolve(index,name): string|null`; `search(index,query,type?,tag?,limit?)`; `pageView(index,name)`; `backlinksView(index,name)`; `relatedView(index,name)`.
- `test/fixtures.ts` produces: `createFakeVault(): string` (temp dir with the pages below + `创作/` + `CLAUDE.md` + `工具/`).

- [ ] **Step 1: Write the shared fixture**

```ts
// test/fixtures.ts
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";

function w(root: string, rel: string, content: string): void {
  const fp = path.join(root, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content, "utf-8");
}

export function createFakeVault(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dedao-"));
  w(root, "工具/叙事.md",
    "---\ntype: tool\naliases: [Narrative]\ntags: [板块/基本世界观]\nupdated: 2026-05-15\n---\n## 一句话定义\n对事实的连贯描述。\n## 相关工具\n- [[认知解耦]]\n");
  w(root, "工具/认知解耦.md",
    "---\ntype: tool\ntags: [板块/基本世界观]\nupdated: 2026-06-01\n---\n## 一句话定义\n把叙事和事实拆开。\n");
  w(root, "人物/万维钢.md",
    "---\ntype: person\naliases: [Wan Weigang]\nupdated: 2026-04-01\n---\n## 简介\n科学作家，讲叙事与认知解耦。\n");
  w(root, "来源/叙事这节课.md",
    "---\ntype: source\nupdated: 2026-05-15\n---\n## 关键概念\n- [[叙事]]\n- [[认知解耦]]\n");
  // deliberately broken frontmatter — must be skipped, not fatal
  w(root, "概念/坏页.md",
    "---\ntype: concept\naliases: [unclosed\n---\n## 一句话定义\n坏的 YAML。\n");
  fs.mkdirSync(path.join(root, "创作"), { recursive: true });
  fs.writeFileSync(path.join(root, "CLAUDE.md"), "x", "utf-8");
  return root;
}
```

- [ ] **Step 2: Write the failing test**

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bunx vitest run test/vaultIndex.test.ts`
Expected: FAIL — cannot resolve `../src/vaultIndex`.

- [ ] **Step 4: Implement `src/vaultIndex.ts`**

```ts
// src/vaultIndex.ts
import * as path from "node:path";
import * as fs from "node:fs";
import { WIKI_FOLDERS } from "./config";
import { Page, parsePage, oneLiner, parseLinkTarget, WIKILINK_RE } from "./pages";

export interface VaultIndex {
  pages: Map<string, Page>;
  aliasIndex: Map<string, string>;
  backlinks: Map<string, Set<string>>;
  warnings: string[];
}

function listMd(dir: string): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return entries.filter((f) => f.endsWith(".md")).sort().map((f) => path.join(dir, f));
}

export function buildIndex(root: string): VaultIndex {
  const pages = new Map<string, Page>();
  const aliasIndex = new Map<string, string>();
  const warnings: string[] = [];
  for (const folder of WIKI_FOLDERS) {
    for (const filePath of listMd(path.join(root, folder))) {
      let page: Page;
      try {
        page = parsePage(filePath);
      } catch (e) {
        warnings.push(`${filePath}: ${e}`);
        continue;
      }
      pages.set(page.name, page);
      aliasIndex.set(page.name.toLowerCase(), page.name);
      for (const a of page.aliases) aliasIndex.set(a.toLowerCase(), page.name);
    }
  }
  const backlinks = new Map<string, Set<string>>();
  for (const page of pages.values()) {
    for (const target of page.outlinks) {
      const canon = aliasIndex.get(target.toLowerCase());
      if (canon) {
        if (!backlinks.has(canon)) backlinks.set(canon, new Set());
        backlinks.get(canon)!.add(page.name);
      }
    }
  }
  return { pages, aliasIndex, backlinks, warnings };
}

export function resolve(index: VaultIndex, name: string): string | null {
  if (index.pages.has(name)) return name;
  return index.aliasIndex.get(name.toLowerCase()) ?? null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length) || 1;
  return 1 - levenshtein(a, b) / max;
}

function suggest(index: VaultIndex, name: string, k = 5): string[] {
  const q = name.toLowerCase();
  return [...index.aliasIndex.keys()]
    .map((key) => [key, similarity(q, key)] as [string, number])
    .filter(([, s]) => s >= 0.6)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([key]) => key);
}

function byName(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function score(page: Page, q: string): number {
  if (!q) return 0;
  const name = page.name.toLowerCase();
  if (q === name) return 100;
  if (name.includes(q)) return 80;
  if (page.aliases.some((a) => a.toLowerCase().includes(q))) return 60;
  if (oneLiner(page.sections).toLowerCase().includes(q)) return 40;
  if (page.body.toLowerCase().includes(q)) return 20;
  return 0;
}

export function search(index: VaultIndex, query: string, type?: string, tag?: string, limit = 20) {
  const q = query.toLowerCase().trim();
  const scored: [number, Page][] = [];
  for (const page of index.pages.values()) {
    if (type && page.type !== type) continue;
    if (tag && !page.tags.includes(tag)) continue;
    const s = score(page, q);
    if (s > 0) scored.push([s, page]);
  }
  scored.sort((a, b) => b[0] - a[0] || byName(a[1].name, b[1].name));
  return scored.slice(0, limit).map(([s, p]) => ({
    name: p.name, type: p.type, one_liner: oneLiner(p.sections), score: s, path: p.path,
  }));
}

export function pageView(index: VaultIndex, name: string) {
  const canon = resolve(index, name);
  if (!canon) return { error: "not_found", suggestions: suggest(index, name) };
  const p = index.pages.get(canon)!;
  const outlinks: string[] = [];
  for (const o of p.outlinks) {
    const t = resolve(index, o);
    if (t && !outlinks.includes(t)) outlinks.push(t);
  }
  return {
    name: p.name, type: p.type, aliases: p.aliases, tags: p.tags,
    frontmatter: p.frontmatter, sections: p.sections, outlinks, path: p.path,
  };
}

export function backlinksView(index: VaultIndex, name: string) {
  const canon = resolve(index, name);
  if (!canon) return { error: "not_found", suggestions: suggest(index, name) };
  const srcs = [...(index.backlinks.get(canon) ?? new Set<string>())].sort(byName);
  return srcs.map((s) => {
    const p = index.pages.get(s)!;
    return { name: p.name, type: p.type, one_liner: oneLiner(p.sections) };
  });
}

export function relatedView(index: VaultIndex, name: string) {
  const canon = resolve(index, name);
  if (!canon) return { error: "not_found", suggestions: suggest(index, name) };
  const p = index.pages.get(canon)!;
  const related = new Map<string, string>();
  for (const key of ["相关工具", "相关概念"]) {
    const section = p.sections[key] ?? "";
    for (const m of section.matchAll(WIKILINK_RE)) {
      const t = resolve(index, parseLinkTarget(m[1]));
      if (t && t !== canon && !related.has(t)) related.set(t, `section:${key}`);
    }
  }
  const sources = [...(index.backlinks.get(canon) ?? new Set<string>())].filter(
    (s) => index.pages.get(s)!.type === "source",
  );
  for (const src of sources) {
    for (const co of index.pages.get(src)!.outlinks) {
      const t = resolve(index, co);
      if (t && t !== canon && !related.has(t)) {
        const tp = index.pages.get(t);
        if (tp && (tp.type === "tool" || tp.type === "concept")) related.set(t, `co-cited:${src}`);
      }
    }
  }
  return [...related.entries()].map(([t, reason]) => {
    const pp = index.pages.get(t)!;
    return { name: pp.name, type: pp.type, one_liner: oneLiner(pp.sections), reason };
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bunx vitest run test/vaultIndex.test.ts`
Expected: PASS (7 passed).

- [ ] **Step 6: Commit**

```bash
git add _mcp/dedao-vault-mcp/src/vaultIndex.ts _mcp/dedao-vault-mcp/test/fixtures.ts _mcp/dedao-vault-mcp/test/vaultIndex.test.ts
git commit -m "feat(mcp): vault index, search, backlinks, related"
```

---

### Task 4: Topic picker (`src/topics.ts`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/src/topics.ts`
- Test: `_mcp/dedao-vault-mcp/test/topics.test.ts`

**Interfaces:**
- Consumes: `vaultIndex.VaultIndex`/`buildIndex`, `pages.oneLiner`.
- Produces: `VALID_MODES: Set<string>`; `pickTopics(index, mode, type?, tag?, count?, writtenCovers?: Set<string>)` → `{name,type,one_liner,why}[]`. `mode ∈ {random,by_tag,recently_updated,least_linked,unused}`; unknown mode throws.

- [ ] **Step 1: Write the failing test**

```ts
// test/topics.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/topics.test.ts`
Expected: FAIL — cannot resolve `../src/topics`.

- [ ] **Step 3: Implement `src/topics.ts`**

```ts
// src/topics.ts
import { VaultIndex } from "./vaultIndex";
import { Page, oneLiner } from "./pages";

export const VALID_MODES = new Set([
  "random", "by_tag", "recently_updated", "least_linked", "unused",
]);

function byName(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function pickTopics(
  index: VaultIndex,
  mode: string,
  type?: string,
  tag?: string,
  count = 5,
  writtenCovers: Set<string> = new Set(),
) {
  if (!VALID_MODES.has(mode)) throw new Error(`unknown mode: ${mode}`);
  const cand: Page[] = [];
  for (const p of index.pages.values()) {
    if (type && p.type !== type) continue;
    if (tag && !p.tags.includes(tag)) continue;
    if (writtenCovers.has(p.name)) continue;
    cand.push(p);
  }
  if (mode === "recently_updated") {
    cand.sort((a, b) => {
      const av = String(a.frontmatter.updated ?? "");
      const bv = String(b.frontmatter.updated ?? "");
      return av < bv ? 1 : av > bv ? -1 : 0;
    });
  } else if (mode === "least_linked") {
    const bc = (p: Page) => index.backlinks.get(p.name)?.size ?? 0;
    cand.sort((a, b) => bc(a) - bc(b) || byName(a.name, b.name));
  } else if (mode === "random") {
    for (let i = cand.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cand[i], cand[j]] = [cand[j], cand[i]];
    }
  } else {
    cand.sort((a, b) => byName(a.name, b.name));
  }
  const why = (p: Page) => {
    if (mode === "least_linked") return `backlinks=${index.backlinks.get(p.name)?.size ?? 0}`;
    if (mode === "recently_updated") return `updated=${p.frontmatter.updated ?? ""}`;
    return mode;
  };
  return cand.slice(0, count).map((p) => ({
    name: p.name, type: p.type, one_liner: oneLiner(p.sections), why: why(p),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/topics.test.ts`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

```bash
git add _mcp/dedao-vault-mcp/src/topics.ts _mcp/dedao-vault-mcp/test/topics.test.ts
git commit -m "feat(mcp): pickTopics with 5 modes + exclude_written"
```

---

### Task 5: Column config (`src/columns.ts`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/src/columns.ts`
- Test: `_mcp/dedao-vault-mcp/test/columns.test.ts`

**Interfaces:**
- Produces: `loadColumns(creationRoot): any[] | {error}` (list of column objects, or error dict on missing/bad file; keeps only objects with `id`); `listColumns(creationRoot)` → summaries `{id,name,format,language,topic_mode}` or error dict; `getColumn(creationRoot,id)` → full column or `{error:"column_not_found", available}`.

- [ ] **Step 1: Write the failing test**

```ts
// test/columns.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/columns.test.ts`
Expected: FAIL — cannot resolve `../src/columns`.

- [ ] **Step 3: Implement `src/columns.ts`**

```ts
// src/columns.ts
import * as path from "node:path";
import * as fs from "node:fs";
import * as YAML from "yaml";

const SUMMARY_KEYS = ["id", "name", "format", "language", "topic_mode"];

function columnsPath(creationRoot: string): string {
  return path.join(creationRoot, "_栏目.yaml");
}

export function loadColumns(creationRoot: string): any[] | Record<string, any> {
  const p = columnsPath(creationRoot);
  if (!fs.existsSync(p)) return { error: "columns_file_missing", path: p };
  let data: any;
  try {
    data = YAML.parse(fs.readFileSync(p, "utf-8")) ?? {};
  } catch (e) {
    return { error: "yaml_error", detail: String(e) };
  }
  const cols = Array.isArray(data.columns) ? data.columns : [];
  return cols.filter((c: any) => c && typeof c === "object" && "id" in c);
}

export function listColumns(creationRoot: string) {
  const cols = loadColumns(creationRoot);
  if (!Array.isArray(cols)) return cols;
  return cols.map((c) => Object.fromEntries(SUMMARY_KEYS.map((k) => [k, c[k] ?? null])));
}

export function getColumn(creationRoot: string, id: string) {
  const cols = loadColumns(creationRoot);
  if (!Array.isArray(cols)) return cols;
  const found = cols.find((c) => c.id === id);
  if (found) return found;
  return { error: "column_not_found", available: cols.map((c) => c.id) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/columns.test.ts`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

```bash
git add _mcp/dedao-vault-mcp/src/columns.ts _mcp/dedao-vault-mcp/test/columns.test.ts
git commit -m "feat(mcp): column config loader"
```

---

### Task 6: Draft save/list with path guard (`src/drafts.ts`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/src/drafts.ts`
- Test: `_mcp/dedao-vault-mcp/test/drafts.test.ts`

**Interfaces:**
- Consumes: `pages.parseFrontmatter`.
- Produces: `slugify(title): string`; `safeDir(creationRoot, column): string` (throws `path_rejected` on empty/blank/`.`/traversal/absolute); `saveDraft(creationRoot, column, format, title, body, covers, language?, today?)` → `{path,status:"saved"}` | `{error:"path_rejected"}`; `listDrafts(creationRoot, column?, limit?)` → `{path,column,title,covers,created,status}[]`, newest first, skips `_`-dirs, path-guards an explicit column.

- [ ] **Step 1: Write the failing test**

```ts
// test/drafts.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/drafts.test.ts`
Expected: FAIL — cannot resolve `../src/drafts`.

- [ ] **Step 3: Implement `src/drafts.ts`**

```ts
// src/drafts.ts
import * as path from "node:path";
import * as fs from "node:fs";
import * as YAML from "yaml";
import { parseFrontmatter } from "./pages";

export function slugify(title: string): string {
  let s = title.trim().toLowerCase();
  s = s.replace(/[^\p{L}\p{N}]+/gu, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s.slice(0, 50) || "draft";
}

export function safeDir(creationRoot: string, column: string): string {
  if (!column || !column.trim()) throw new Error("path_rejected");
  const root = path.resolve(creationRoot);
  const target = path.resolve(root, column);
  const rel = path.relative(root, target);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("path_rejected");
  }
  return target;
}

function frontmatterBlock(fm: Record<string, any>): string {
  return `---\n${YAML.stringify(fm).trimEnd()}\n---`;
}

export function saveDraft(
  creationRoot: string,
  column: string,
  format: string,
  title: string,
  body: string,
  covers: string[],
  language?: string,
  today?: string,
): { path: string; status: string } | { error: string } {
  let dir: string;
  try {
    dir = safeDir(creationRoot, column);
  } catch {
    return { error: "path_rejected" };
  }
  fs.mkdirSync(dir, { recursive: true });
  const date = today ?? new Date().toISOString().slice(0, 10);
  const filePath = path.join(dir, `${date}-${slugify(title)}.md`);
  const fm: Record<string, any> = { type: "draft", column, format };
  if (language !== undefined && language !== null) fm.language = language;
  fm.covers = covers;
  fm.status = "pending-review";
  fm.created = date;
  const used = covers.map((c) => `- ${c}`).join("\n");
  const content = `${frontmatterBlock(fm)}\n\n${body}\n\n---\n## 用到的知识库页面\n${used}\n`;
  fs.writeFileSync(filePath, content, "utf-8");
  return { path: filePath, status: "saved" };
}

export function listDrafts(creationRoot: string, column?: string, limit = 50) {
  if (!fs.existsSync(creationRoot)) return [];
  let dirs: string[];
  if (column) {
    if (column.startsWith("_")) return [];
    try {
      dirs = [safeDir(creationRoot, column)];
    } catch {
      return [];
    }
  } else {
    dirs = fs.readdirSync(creationRoot)
      .map((f) => path.join(creationRoot, f))
      .filter((p) => {
        try {
          return fs.statSync(p).isDirectory() && !path.basename(p).startsWith("_");
        } catch {
          return false;
        }
      });
  }
  const out: any[] = [];
  for (const d of dirs) {
    let entries: string[];
    try {
      entries = fs.readdirSync(d);
    } catch {
      continue;
    }
    for (const f of entries.filter((x) => x.endsWith(".md")).sort()) {
      const fp = path.join(d, f);
      const [fm] = parseFrontmatter(fs.readFileSync(fp, "utf-8"));
      out.push({
        path: fp, column: fm.column ?? null, title: path.basename(fp, ".md"),
        covers: fm.covers ?? [], created: fm.created ?? null, status: fm.status ?? null,
      });
    }
  }
  out.sort((a, b) => {
    const av = String(a.created ?? ""), bv = String(b.created ?? "");
    return av < bv ? 1 : av > bv ? -1 : 0;
  });
  return out.slice(0, limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/drafts.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add _mcp/dedao-vault-mcp/src/drafts.ts _mcp/dedao-vault-mcp/test/drafts.test.ts
git commit -m "feat(mcp): saveDraft/listDrafts with path guard"
```

---

### Task 7: Tool definitions + MCP server wiring (`src/tools.ts`, `src/server.ts`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/src/tools.ts`
- Create: `_mcp/dedao-vault-mcp/src/server.ts`
- Test: `_mcp/dedao-vault-mcp/test/server.test.ts`
- Test: `_mcp/dedao-vault-mcp/test/columnsIntegration.test.ts`

**Interfaces:**
- `tools.ts` produces: `Ctx` (`{root, creation, state:{index}, refresh()}`); `ToolDef` (`{name,title,description,inputSchema: ZodRawShape, handler}`); `makeTools(ctx): ToolDef[]` (exactly the 10 tools; `pick_topics` resolves `exclude_written` by reading draft covers → `parseLinkTarget` → `resolve`).
- `server.ts` produces: `createContext(): Ctx`; `createServer(ctx): McpServer` (registers each tool via `server.tool(name, description, shape, handler)`, wrapping the result as `{content:[{type:"text",text:JSON.stringify(...)}]}`); `main()` (stdio connect). Auto-runs `main()` only when executed directly (`import.meta.main`).

- [ ] **Step 1: Write the failing tests**

```ts
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
```

```ts
// test/columnsIntegration.test.ts
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { resolveRoot, CREATION_FOLDER } from "../src/config";
import { buildIndex } from "../src/vaultIndex";
import { loadColumns } from "../src/columns";
import { pickTopics } from "../src/topics";

// Guards against tag/type drift: each shipped column's topic_filter must
// match >=1 page in the real vault.
describe("real columns", () => {
  it("each column yields candidates", () => {
    let root: string;
    try {
      root = resolveRoot();
    } catch {
      return; // no real vault root — skip
    }
    const cols = loadColumns(path.join(root, CREATION_FOLDER));
    if (!Array.isArray(cols)) return; // no real _栏目.yaml — skip
    const idx = buildIndex(root);
    for (const col of cols) {
      const tf = col.topic_filter ?? {};
      const got = pickTopics(idx, "unused", tf.type, tf.tag, 5);
      expect(got.length, `column ${col.id} filter ${JSON.stringify(tf)} yields none`).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run test/server.test.ts test/columnsIntegration.test.ts`
Expected: FAIL — cannot resolve `../src/tools` / `../src/server`.

- [ ] **Step 3: Implement `src/tools.ts`**

```ts
// src/tools.ts
import { z, type ZodRawShape } from "zod";
import {
  VaultIndex, buildIndex, search, pageView, backlinksView, relatedView, resolve,
} from "./vaultIndex";
import { pickTopics } from "./topics";
import { listColumns, getColumn } from "./columns";
import { saveDraft, listDrafts } from "./drafts";
import { parseLinkTarget } from "./pages";

export interface Ctx {
  root: string;
  creation: string;
  state: { index: VaultIndex };
  refresh(): void;
}

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  handler: (args: any) => any | Promise<any>;
}

export function makeTools(ctx: Ctx): ToolDef[] {
  const idx = () => ctx.state.index;
  return [
    {
      name: "search_pages",
      title: "Search pages",
      description: "Keyword/alias search over the wiki, ranked by hit location.",
      inputSchema: { query: z.string(), type: z.string().optional(), tag: z.string().optional(), limit: z.number().optional() },
      handler: ({ query, type, tag, limit }) => search(idx(), query, type, tag, limit ?? 20),
    },
    {
      name: "get_page",
      title: "Get page",
      description: "Full page: frontmatter + sections + resolved outlinks. Resolves aliases.",
      inputSchema: { name: z.string() },
      handler: ({ name }) => pageView(idx(), name),
    },
    {
      name: "get_backlinks",
      title: "Get backlinks",
      description: "Pages that link to this page.",
      inputSchema: { name: z.string() },
      handler: ({ name }) => backlinksView(idx(), name),
    },
    {
      name: "get_related",
      title: "Get related",
      description: "Related pages via 相关工具/相关概念 sections and shared sources.",
      inputSchema: { name: z.string() },
      handler: ({ name }) => relatedView(idx(), name),
    },
    {
      name: "pick_topics",
      title: "Pick topics",
      description: "Candidate topics. mode: random|by_tag|recently_updated|least_linked|unused.",
      inputSchema: { mode: z.string(), type: z.string().optional(), tag: z.string().optional(), count: z.number().optional(), exclude_written: z.boolean().optional() },
      handler: ({ mode, type, tag, count, exclude_written }) => {
        const written = new Set<string>();
        if (exclude_written ?? true) {
          for (const d of listDrafts(ctx.creation)) {
            for (const c of (d.covers ?? [])) {
              const t = resolve(idx(), parseLinkTarget(c));
              if (t) written.add(t);
            }
          }
        }
        return pickTopics(idx(), mode, type, tag, count ?? 5, written);
      },
    },
    {
      name: "list_columns",
      title: "List columns",
      description: "List configured content columns (创作/_栏目.yaml).",
      inputSchema: {},
      handler: () => listColumns(ctx.creation),
    },
    {
      name: "get_column",
      title: "Get column",
      description: "Full config for one column.",
      inputSchema: { id: z.string() },
      handler: ({ id }) => getColumn(ctx.creation, id),
    },
    {
      name: "save_draft",
      title: "Save draft",
      description: "Save a review-ready draft under 创作/<column>/. Writes confined to 创作/.",
      inputSchema: { column: z.string(), format: z.string(), title: z.string(), body: z.string(), covers: z.array(z.string()), language: z.string().optional() },
      handler: ({ column, format, title, body, covers, language }) =>
        saveDraft(ctx.creation, column, format, title, body, covers, language),
    },
    {
      name: "list_drafts",
      title: "List drafts",
      description: "List existing drafts (for dedup / review).",
      inputSchema: { column: z.string().optional(), limit: z.number().optional() },
      handler: ({ column, limit }) => listDrafts(ctx.creation, column, limit ?? 50),
    },
    {
      name: "refresh_index",
      title: "Refresh index",
      description: "Re-scan the wiki into memory.",
      inputSchema: {},
      handler: () => {
        ctx.refresh();
        return { pages_indexed: idx().pages.size, warnings: idx().warnings };
      },
    },
  ];
}
```

- [ ] **Step 4: Implement `src/server.ts`**

```ts
// src/server.ts
import * as path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveRoot, CREATION_FOLDER } from "./config";
import { buildIndex } from "./vaultIndex";
import { makeTools, type Ctx } from "./tools";

export function createContext(): Ctx {
  const root = resolveRoot();
  const creation = path.join(root, CREATION_FOLDER);
  const state = { index: buildIndex(root) };
  return {
    root,
    creation,
    state,
    refresh() {
      state.index = buildIndex(root);
    },
  };
}

export function createServer(ctx: Ctx): McpServer {
  const server = new McpServer({ name: "dedao-vault", version: "0.1.0" });
  for (const def of makeTools(ctx)) {
    server.tool(def.name, def.description, def.inputSchema, async (args: any) => {
      const result = await def.handler(args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    });
  }
  return server;
}

export async function main(): Promise<void> {
  const server = createServer(createContext());
  await server.connect(new StdioServerTransport());
}

// Run only when executed directly (bun sets import.meta.main), not when imported by tests.
if ((import.meta as any).main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bunx vitest run test/server.test.ts test/columnsIntegration.test.ts`
Expected: PASS. (The integration test passes because the real `创作/_栏目.yaml`, merged earlier, uses the valid tag `板块/决策与行动`.)

> If `server.tool(name, description, shape, handler)` is not a valid overload in the installed SDK version, switch to `server.registerTool(def.name, { title: def.title, description: def.description, inputSchema: def.inputSchema }, wrappedHandler)` — keep `inputSchema` as the raw shape object; if THAT rejects a raw shape, wrap it as `z.object(def.inputSchema)`. Use whichever the installed SDK accepts; report which form you used.

- [ ] **Step 6: Run the full suite + typecheck**

Run: `bunx vitest run` then `bunx tsc --noEmit`
Expected: all tests pass; typecheck clean (no errors).

- [ ] **Step 7: Commit**

```bash
git add _mcp/dedao-vault-mcp/src/tools.ts _mcp/dedao-vault-mcp/src/server.ts _mcp/dedao-vault-mcp/test/server.test.ts _mcp/dedao-vault-mcp/test/columnsIntegration.test.ts
git commit -m "feat(mcp): tool defs + FastMCP-style server wiring (10 tools)"
```

---

### Task 8: README (bun wiring) + verify content layer unchanged

**Files:**
- Create: `_mcp/dedao-vault-mcp/README.md`
- Verify (do NOT edit): `创作/_栏目.yaml`, `创作/_prompts/*.md`, `创作/README.md`

**Interfaces:** No code. Verified by the full suite staying green and a manual smoke run.

- [ ] **Step 1: Write `_mcp/dedao-vault-mcp/README.md`**

```markdown
# dedao-vault-mcp (TypeScript)

Local MCP server exposing the DeDao-100 wiki for content creation. Runtime: bun.

## Install & test

    cd _mcp/dedao-vault-mcp
    bun install
    bunx vitest run        # all green
    bunx tsc --noEmit      # typecheck

## Claude Desktop wiring

Add to `claude_desktop_config.json` → `mcpServers` (bun runs the .ts entry directly — no build step):

    {
      "mcpServers": {
        "dedao-vault": {
          "command": "bun",
          "args": [
            "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools/_mcp/dedao-vault-mcp/src/server.ts"
          ],
          "env": {
            "DEDAO_VAULT_ROOT": "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
          }
        }
      }
    }

Restart Claude Desktop. Tools: search_pages, get_page, get_backlinks, get_related,
pick_topics, list_columns, get_column, save_draft, list_drafts, refresh_index.
Writes are confined to `创作/`.
```

- [ ] **Step 2: Confirm the content layer is intact and valid**

Run (from `_mcp/dedao-vault-mcp/`):
```bash
DEDAO_VAULT_ROOT="/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools" \
  bun -e 'import {resolveRoot,CREATION_FOLDER} from "./src/config"; import {buildIndex} from "./src/vaultIndex"; import {loadColumns} from "./src/columns"; import {pickTopics} from "./src/topics"; import * as path from "node:path"; const r=resolveRoot(); const idx=buildIndex(r); for (const c of loadColumns(path.join(r,CREATION_FOLDER))) { const tf=c.topic_filter??{}; console.log(c.id, c.language, JSON.stringify(tf), pickTopics(idx,"unused",tf.type,tf.tag,99).length); }'
```
Expected: two lines, e.g. `thinking-tools-uk en-GB {"type":"tool"} 58` and `daily-tool-zh zh {"type":"tool","tag":"板块/决策与行动"} 17`. Confirm `创作/_栏目.yaml` and `创作/_prompts/*.md` were NOT modified by this work (`git status` shows only the new TS package + this README).

- [ ] **Step 3: Manual end-to-end (USER step — document, do not perform)**

Wire into Claude Desktop per the README; restart; paste `创作/_prompts/thinking-tools-uk.md` into a task; trigger; confirm a draft appears at `创作/thinking-tools-uk/<date>-<slug>.md`.

- [ ] **Step 4: Commit**

```bash
git add _mcp/dedao-vault-mcp/README.md
git commit -m "docs(mcp): bun wiring README for the TypeScript server"
```

---

## Self-Review

**Spec coverage (against §1–§9 of the design):**
- §4.1 boundaries → `safeDir` (Task 6), read-only scans (Task 3), `listDrafts` column path-guard (Task 6). ✓
- §4.2 index model (3 maps + warnings, broken-page skip) → Task 3. ✓
- §4.3 all 10 tools → search/get_page/get_backlinks/get_related (T3 via tools T7), pick_topics (T4+T7), list_columns/get_column (T5+T7), save_draft/list_drafts (T6+T7), refresh_index (T7). ✓
- §4.4 error handling → broken-FM skip (T3), not_found suggestions (T3), path_rejected (T6), yaml_error (T5), empty results. ✓
- §5.1–§5.5 content layer → unchanged, verified in T8. ✓
- §9 TS deltas → bun/vitest/zod/yaml (T1), tools.ts/server.ts split (T7), `import.meta.main` guard (T7), path.relative containment (T6), text-content returns (T7), Claude Desktop bun wiring (T8). ✓
- Python removal → T1 `git rm -r`. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; the SDK-overload contingency in T7 names the exact fallback API.

**Type/name consistency:** `VaultIndex` (Maps), `resolve`, `parseLinkTarget`, `oneLiner(sections)`, `pickTopics(..., writtenCovers)`, `saveDraft(..., today?)`, `safeDir`, `makeTools(ctx)`, `Ctx`, `ToolDef` are used consistently across tasks. Tool names match the 10 in T7's test and the README. The integration test (T7) and T8 verification both rely on the merged-in real `创作/_栏目.yaml` tag `板块/决策与行动`.
