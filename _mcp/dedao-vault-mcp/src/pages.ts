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

// Use only with String.prototype.matchAll (never .exec()) — a shared /g regex carries lastIndex across exec calls.
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
