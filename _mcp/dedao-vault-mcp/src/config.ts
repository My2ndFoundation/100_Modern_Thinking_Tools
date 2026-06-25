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
