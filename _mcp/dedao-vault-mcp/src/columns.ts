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
