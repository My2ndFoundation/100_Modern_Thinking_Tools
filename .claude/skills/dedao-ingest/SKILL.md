---
name: dedao-ingest
description: Use when the user wants to ingest a raw 得到《现代思维工具课》clipping into the wiki. Triggers on "ingest"、"处理这篇"、"消化这节课", or when the user supplies a path under raw/ in the DeDao-100 project.
model: claude-opus-4-7
effort: high
---

# DeDao-100 Ingest Workflow

## Overview

Processes one raw lesson clipping from `raw/` into the Chinese knowledge wiki (`来源/`、`工具/`、`概念/`、`人物/`、`著作/`). Authoritative procedure lives in `CLAUDE.md` §5; this skill enforces ordering, the user-checkpoint, and the no-overwrite rules so they cannot be skipped.

## Arguments

The skill accepts one raw file path:
```
/dedao-ingest raw/<lesson-title>.md
```

If no argument: ask "想 ingest `raw/` 下的哪一篇？" Do not guess.

## The Non-Negotiable Rule

**You MUST run the Step 3 checkpoint and wait for the user to redirect emphasis BEFORE writing anything to the wiki.**

No file in `来源/`、`工具/`、`概念/`、`人物/`、`著作/`、`index.md`、`log.md` is touched until the user has confirmed direction.

Equally non-negotiable:
- `raw/` is read-only. Never write, never modify (CLAUDE.md §2, §9).
- Never silently overwrite a contradicting claim — flag with `> ⚠️ 与 [[…]] 中的说法不同：…` (CLAUDE.md §5 / §9).
- Never duplicate an entity that already exists under an alias — alias-search the wiki first (CLAUDE.md §4).
- Never use training-data facts without `(*not from wiki*)` (CLAUDE.md §6 / §9).

## Workflow (follow in order, no skipping)

**Step 1 — Read the raw source end-to-end**
Read BOTH the frontmatter (clipping metadata) AND the body. From the body, identify: 板块, 课程主旨, 工具 (introduced or applied), 概念, 人物, 著作/论文, cross-references to other lessons. From the frontmatter, capture: `source:` URL, any `[[…]]` back-reference wikilinks (typically under `author:` — these point at the course master page).

**Step 2 — Alias-search existing entities + check frontmatter backlinks**
Before deciding what is "new":
- Grep wiki frontmatter `aliases:` and filenames for every candidate entity. One entity = one page.
- For each frontmatter back-reference wikilink (e.g. `[[万维钢·现代思维⼯具100讲]]`), check if it resolves to an existing wiki page. **Preserve the EXACT string** — including special characters like CJK radical `⼯` (U+2F2F) vs. normal `工` (U+5DE5). If unresolved, plan to add the raw spelling as an alias on the matching 著作/人物 page (do NOT normalize the character).

**Step 3 — Checkpoint with user** ← REQUIRED BEFORE ANY WRITES
Report in chat:
- 一段话总结 (1 paragraph)
- 抽取的实体清单, 分四类: 工具 / 概念 / 人物 / 著作
- 每个实体标注 **新建 stub** 还是 **更新已有页面 `[[…]]`**
- Frontmatter backlinks found and how they'll resolve (alias to add, or already resolves)
- Surprises, gaps, or anything that contradicts existing wiki claims
- Proposed `来源/<lesson-title>.md` filename

**Wait for the user.** They may redirect emphasis, rename pages, drop entities, or merge aliases.

**Step 4 — Write `来源/<lesson-title>.md`**
Per CLAUDE.md §3 source template: 一句话总结、核心论点、关键概念、引用人物与著作、与其他课程的连接、我的反应 (留空)、**原文**. All entities as `[[wikilinks]]`. Frontmatter per CLAUDE.md §3.

For `## 原文`: insert the verbatim raw body per CLAUDE.md §5「原文 insertion」rules. Strip raw frontmatter, the duplicate title+duration line, the 转述 line, and `已添加到笔记`. Keep body, ✵ separators, 收束小诗, 注释 (promote to `### 注释`), 划重点 (promote to `### 划重点`). Add a `> 来源：…\n> 出处：[[…]] · <duration>` preamble. The 来源 page must be self-contained — `raw/` is not exposed in static-HTML publish.

**Image localization (mandatory, part of Step 4)** — see CLAUDE.md §5「图片本地化」for the full rules. Per image, in document order:
```bash
mkdir -p "assets/<lesson-title>"
[ -f "assets/<lesson-title>/NN.<ext>" ] || curl -fsSL --create-dirs \
  -o "assets/<lesson-title>/NN.<ext>" "<url>"
```
Then rewrite the body line `![](https://piccdn2…)` to:
```markdown
![](assets/<lesson-title>/NN.<ext>)
<!-- src: <original URL> -->
```
On `curl` failure: prepend `<!-- ⚠️ download failed: <url> -->` and keep the URL inline. Surface the failure in Step 9. NEVER write to `raw/assets/` — that's the user's Obsidian-hotkey area.

**Step 5 — Create stubs / update existing entity pages**
- **New entity** → stub with full type-specific scaffolding from CLAUDE.md §3, populating only `一句话定义` and `## 出现在` (lists this source). See CLAUDE.md §5 stub example for `工具/叙事.md`.
- **Existing entity** → append this source under `## 出现在`; update the relevant content section (`详细解释` / `何时使用` / `操作步骤` / `主要贡献` / etc.) only if this source genuinely adds nuance. On contradiction, add `⚠️` flag — never overwrite. Bump `updated:` and `sources:` in frontmatter.

**Step 6 — Update `index.md`**
Add new entries under their type section, one line each: `- [[<name>]] — one-line summary`. Include the new source under `## 来源 (Sources)` with today's date.

**Step 7 — Append to `log.md`**
Per CLAUDE.md §8 format. Header MUST be parseable:
```
## [YYYY-MM-DD] ingest | <lesson title>
- 新建：来源(1) 工具(N) 概念(N) 人物(N) 著作(N)
- 更新：<list of updated pages>
- 备注：<contradictions, deferred decisions, anything noteworthy>
```
`来源(1)` is always exactly `1`. Other counts vary, including 0.

**Step 8 — Append to `.claude/state/ingested.tsv`**
This file is the canonical "已处理 raw 清单" used by `/dedao-scan` to diff. Append exactly one TAB-separated row, no quoting:
```
<raw_path>\t<YYYY-MM-DD>\t<source_page>
```
Example:
```
raw/叙事：这个宇宙的第一性原理 - 得到APP.md	2026-05-08	来源/叙事：这个宇宙的第一性原理.md
```
- `<raw_path>` — exact path you were given, including ` - 得到APP.md` suffix if present.
- `<YYYY-MM-DD>` — today's date (the same date used in `log.md` Step 7).
- `<source_page>` — the file you wrote in Step 4.
If the file does not exist yet, create it with the header block (see existing file for format). Never reorder, never deduplicate, never edit prior rows — append-only.

**Step 9 — Report back**
Tell the user: # of pages touched, list of `⚠️` flags raised, anything that needs a follow-up source. Mention that the state file was updated.

**Step 10 — DO NOT auto-commit**
Unlike some workflows, this project does not auto-commit on ingest. Leave the working tree dirty so the user can review the diff. Only commit if the user explicitly says so.

## Edge Cases (from CLAUDE.md §5)

| Situation | Handling |
|---|---|
| Raw file unparseable | Stop. Report. Write nothing. |
| Ambiguous entity (could be 2 existing pages) | Fuzzy-match aliases first; ask user if unresolved. |
| Source contradicts an existing wiki claim | `⚠️` flag inside the entity page; surface in Step 8. Do not edit the contradicted claim. |
| Lesson references images in `raw/assets/` | You may view them for context. Do not embed them into wiki pages unless the user asks. |
| Batch request (>1 file) | Confirm explicitly — default is one source at a time (CLAUDE.md §10). |
| Frontmatter backlink uses `⼯` (U+2F2F) instead of `工` (U+5DE5), or any other special-char variant | Add the special-char form as an alias on the target page. Do NOT silently rewrite to "correct" character — raw is the authority on its own backlinks. |
| Raw body has external image URLs (`piccdn2.umiwi.com`) | Localize: download to `assets/<lesson-title>/NN.<ext>`, rewrite the markdown image link, append `<!-- src: <url> -->` for provenance. CDN may expire; static HTML needs local files. |
| Image download fails (404, timeout) | Don't drop the image. Keep URL inline + `<!-- ⚠️ download failed: <url> -->` flag. Surface in Step 9. |

## Common Mistakes

| Mistake | Fix |
|---|---|
| Editing wiki pages before the Step 3 checkpoint | Always checkpoint first — this is the single most-skipped step |
| Creating a duplicate page because alias-search was skipped | Step 2 is non-optional; grep `aliases:` across the whole wiki |
| Overwriting an existing claim that the new source contradicts | Use `⚠️ 与 [[…]] 中的说法不同：…`, never silent overwrite |
| Writing to `raw/` (e.g., adding a header, fixing a typo) | `raw/` is immutable. Read only. |
| Forgetting to bump `updated:` / `sources:` on touched entity pages | Update frontmatter on every page you edit |
| Using English filenames or English headings | Page titles, filenames, and section headings are 中文; English goes in `aliases: []` only |
| Committing without being asked | Step 10 — leave the diff for the user to review |
| Filling in `## 我的反应` on the source page | That section is the user's; leave it blank |
| Forgetting to append to `.claude/state/ingested.tsv` | Step 8 is mandatory — `/dedao-scan` depends on it to identify new files |
| Re-writing or reordering existing rows in `ingested.tsv` | Append-only. If a prior row is wrong, surface it to the user; don't silently rewrite |
| Forgetting `## 原文` in 来源 page | The page MUST be self-contained for static-HTML publish. `raw/` is not exposed. |
| Normalizing `⼯` → `工` (or any special char) when copying backlinks | Add as alias instead. The raw spelling is what other raw files reference. |
| Including raw frontmatter (`---`/`title:`/`tags:`) inside `## 原文` | Strip it. The 来源 page has its own frontmatter; embedded YAML inside the body breaks rendering. |
| Leaving CDN image URLs (`piccdn2.umiwi.com`) in `## 原文` | Localize per CLAUDE.md §5「图片本地化」. CDN can expire; static publish needs local files. |
| Writing image downloads into `raw/assets/` | That's the user's Obsidian-hotkey area. LLM downloads go to root `assets/<lesson-title>/`. |

## Red Flags — STOP

- About to call `Write` / `Edit` on a wiki file before the user has responded to the Step 3 checkpoint
- About to call `Write` / `Edit` on anything under `raw/`
- About to create `工具/X.md` without having grepped `aliases:` for X
- About to finish without appending to `.claude/state/ingested.tsv`
- About to rewrite or reorder rows in `.claude/state/ingested.tsv` (it is append-only)
- About to write a 来源 page without `## 原文` section
- About to "fix" `⼯` to `工` (or any other Unicode normalization) on a frontmatter backlink
- About to leave a `https://piccdn2.umiwi.com/...` URL inline in `## 原文` instead of downloading
- About to write image files to `raw/assets/` (LLM never writes there — root `assets/` only)
- Auto-running `git commit` at the end of the workflow

All of these mean: **stop, back up, re-read CLAUDE.md §5 and §9.**
