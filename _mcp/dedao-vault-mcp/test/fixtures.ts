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
