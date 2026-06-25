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
