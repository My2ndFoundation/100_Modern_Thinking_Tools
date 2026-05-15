---
name: dedao-verify
description: Use when the user wants to source-verify and enrich DeDao-100 wiki entity pages against trusted web sources. Triggers on "溯源"、"verify"、"核实"、"dedao-verify"、"溯源验证", or when the user supplies a path under 工具/、概念/、人物/ in the DeDao-100 project.
model: claude-opus-4-7
effort: high
---

# DeDao-100 Verify Workflow

## Overview

Source-verifies and enriches wiki entity pages (`工具/`、`概念/`、`人物/`) against
trusted web sources, then records state in `.verified.tsv`. Authoritative single-page
SOP lives in `docs/agent-prompts/dedao-verify-page.md`; design rationale in
`docs/superpowers/specs/2026-05-15-dedao-verify-design.md`. This skill enforces the
batch/wave orchestration, the no-overwrite rule, and the state-file discipline.

`著作/` and `来源/` are out of scope. `raw/` is read-only (CLAUDE.md §2).

## Arguments

```
/dedao-verify                       # batch mode: verify all not-yet-verified pages
/dedao-verify 工具/凯利公式.md       # single-page mode
```

## The Non-Negotiable Rules

- `.verified.tsv` is append-only. Never reorder/dedupe/rewrite prior rows.
- Never silently overwrite a contradicting claim — only obvious typos (拼写/年份/
  人名译名/机构名) get a direct fix with an inline `<!-- 溯源订正 … -->` note.
  Genuine factual/interpretive divergence → `> ⚠️ 与权威信源不同：…（[信源](url)）`,
  original kept (CLAUDE.md §9).
- Trusted sources only (维基百科优先 en / 机构·政府·大学官网·官方传记 / 同行评议期刊 /
  可信新闻). No blogs/content-farms/AI-sites as sole source. This is a CLAUDE.md §6
  sanctioned online mode — web access is expected here, not a silent fallback.
- Pages already carrying `verified: <today>` are skipped (idempotent).
- Never write to `raw/`. Never `git commit` from a sub-agent. Sub-agents never touch
  `index.md` / `log.md` / `CLAUDE.md` / `.verified.tsv` / pages outside their batch.

## Workflow

**Step 1 — Diff not-yet-verified pages**
```bash
LC_ALL=C comm -23 \
  <(find 工具 概念 人物 -maxdepth 1 -type f -name '*.md' | LC_ALL=C sort) \
  <(grep -v '^#' .verified.tsv | cut -f1 | LC_ALL=C sort)
```
(`LC_ALL=C` mandatory — zh_CN collation breaks `comm` on CJK.)
Single-page mode: skip the diff; the target is the given path.

**Step 2 — Batch & wave plan**
- Split the diff list by type, ≤30 pages per sub-agent.
- Run in waves of ≤5 concurrent sub-agents; wait for a wave to return before the next.
- If total > ~30 pages, run a **pilot** (one ~12-page batch) first and checkpoint the
  sample with the user before the full run (spec §5). Small/single-page runs skip the pilot.

**Step 3 — Dispatch sub-agents**
For each batch, dispatch a general-purpose agent (model sonnet) whose prompt is the
content of `docs/agent-prompts/dedao-verify-page.md` with `{{TYPE}}` and `{{PAGE_LIST}}`
substituted. For `人物/` batches, prepend the note: 人物页无「一句话定义」，其首段即
`## 简介`——第 4 步为校订/充实已有 `## 简介`，绝不新增重复段。

**Step 4 — After each wave: record state**
Append one row per `STATUS: verified` page to `.verified.tsv`:
```
<wiki_page_path>\t<YYYY-MM-DD>\t verified
```
Cache each sub-agent's structured report for Step 6. Note any `error`/残余 pages.

**Step 5 — Coverage check + remediation**
Re-run the Step 1 diff; expect 0. For残余 / `error` pages, re-dispatch a small
sub-agent (≤3 rounds). Pages still failing are listed as 未能验证 in the report.

**Step 6 — Aggregate report + log (orchestrator only)**
- Write/append `溯源验证报告.md`: 统计 + 笔误订正清单 + ⚠️ 分歧清单 + 未能验证.
- Append one `log.md` event:
  ```
  ## [YYYY-MM-DD] verify | <scope>
  - 验证：工具(a) 概念(b) 人物(c)
  - 订正：X 笔误；⚠️ Y 分歧；补 Z 段
  - 报告：[[溯源验证报告]]
  ```

**Step 7 — Do NOT auto-commit**
Leave the working tree dirty for user review (mirrors `/dedao-ingest` Step 10).
Commit only if the user asks.

## Edge Cases

| Situation | Handling |
|---|---|
| 单页已 `verified: <today>` | Skip; report STATUS skipped. |
| 原创课程概念无外部权威可核 | 简介标 `(*not from wiki*)`；不强挂信源；STATUS verified. |
| 信息时效性差异（人物现职变动） | ⚠️ + 信源；可建议用户直接采纳新信息消除 ⚠️. |
| 译名/归属无权威中文源 | ⚠️ 标注待用户裁定，不臆造. |
| 信源 404/不可达 | 换信源；仍无 → 该断言不订正，报告中记「未能核实」. |
| 人物页 | `## 简介` 是首段，校订不新增；另核生卒/国籍/机构/贡献. |

## Common Mistakes

| Mistake | Fix |
|---|---|
| 把观点分歧当笔误直接覆盖 | 仅拼写/年份/译名/机构算笔误；其余一律 ⚠️ 不覆盖 |
| 人物页新增第二个 `## 简介` | 人物页校订原首段，绝不重复 |
| 重排/去重 `.verified.tsv` | Append-only；prior 行错了也只 surface 不改写 |
| 用博客/AI 站作唯一信源 | 维基/期刊/官网优先；博客至多作补充 |
| sub-agent 碰 index/log/CLAUDE/raw | 只改自己批次实体页 |
| 跑全量前跳过试点门控 | >~30 页须先 12 页试点 + 用户确认 |
| 大波次并发 >5 agent | 每波 ≤5，等回齐再下一波 |
| sub-agent 自行 git commit | 由 orchestrator 收尾，且不自动 commit |

## Red Flags — STOP

- About to overwrite a contradicting claim instead of `⚠️`-flagging it
- About to rewrite/reorder rows in `.verified.tsv`
- About to write to `raw/` or have a sub-agent touch `index.md`/`log.md`/`CLAUDE.md`
- About to launch the full run without the pilot checkpoint (when >~30 pages)
- About to `git commit` automatically at the end

All mean: stop, re-read CLAUDE.md §6/§9 and spec §3/§5.
