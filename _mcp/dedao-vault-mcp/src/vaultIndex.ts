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
  const ranked = [...index.aliasIndex.keys()]
    .map((key) => [key, similarity(q, key)] as [string, number])
    .filter(([, s]) => s >= 0.6)
    .sort((a, b) => b[1] - a[1]);
  const out: string[] = [];
  for (const [key] of ranked) {
    const canon = index.aliasIndex.get(key);
    if (canon && !out.includes(canon)) out.push(canon);
    if (out.length >= k) break;
  }
  return out;
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
