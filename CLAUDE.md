# CLAUDE.md — DeDao 100 Modern Thinking Tools Wiki

## 1. 项目概述

This is an LLM-maintained personal wiki for 万维钢《现代思维工具课》(DeDao app), a 100-lesson course on modern thinking tools. Sources are clipped Chinese articles in `raw/`. The wiki itself is in Chinese, organized as an interlinked Obsidian vault. You (the LLM) maintain it; the user curates sources and asks questions.

## 2. 三层架构

- **`raw/`** — IMMUTABLE. Read only. Never write. Never modify.
- **Wiki folders** (`来源/`, `工具/`, `概念/`, `人物/`, `著作/`) — your responsibility. Create, update, link.
- **`CLAUDE.md`** — this file. Co-evolved with the user; propose updates rather than silent edits.

## 3. 页面规范

Every wiki page MUST have frontmatter:

```yaml
---
type: tool | concept | person | book | source
aliases: [English name, alt names]
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: <integer count of sources mentioning this>
tags: [板块/<section name>]
---
```

Standard sections by type:

### `工具/<name>.md`
- 一句话定义
- 来源 (which sources introduce/discuss it)
- 何时使用
- 操作步骤
- 例子
- 相关工具
- 出现在 (auto-maintained list of source pages)

### `概念/<name>.md`
- 一句话定义
- 来源
- 详细解释
- 相关概念
- 相关工具
- 出现在

### `人物/<name>.md`
- 简介 (one paragraph)
- 主要贡献
- 相关概念
- 相关著作
- 在哪些课程出现

### `著作/<name>.md`
- 作者: `[[…]]`
- 简介
- 核心论点
- 在哪些课程出现

### `来源/<lesson-title>.md`
- 一句话总结
- 核心论点
- 关键概念 (each linked)
- 引用人物与著作 (each linked)
- 与其他课程的连接
- 我的反应 (left blank for the user)

## 4. 命名约定

- Page titles in Chinese (中文). Filenames match titles.
- Cross-language names go in `aliases: []`. Example: `人物/卡尔·弗里斯顿.md` has `aliases: [Karl Friston, 弗里斯顿]`.
- One entity = one page. Before creating a new page, search aliases across the wiki for existing matches. If you find a match under a different name, link to it — never duplicate.
- Frontmatter `type:` values are English enums (`tool | concept | person | book | source`) — stable, queryable. Folder names and human-readable counts in logs/reports use Chinese (`工具/`, `工具(N)`). The two systems coexist by design.

## 5. 工作流：ingest

Trigger: user drops a file in `raw/` and says "ingest" (or names the file).

1. Read the source end-to-end.
2. Extract: tools introduced, concepts referenced, people named, books/papers cited, course section, lesson's main argument.
3. **Checkpoint**: report extracted entities + a one-paragraph summary in chat. Wait for the user to redirect emphasis or scope.
4. Write `来源/<lesson-title>.md` per the template above. All entities as `[[wikilinks]]`.
5. For each entity:
   - **New** → create a stub with: frontmatter + the type-specific top-level section headings (from §3) left empty, populating only `一句话定义` and `## 出现在` (which lists this source). Stubs grow into full pages as more sources are ingested.
   - **Existing** → append source under `## 出现在`; update relevant content sections (e.g., `详细解释` for concepts, `何时使用` / `操作步骤` for tools, `主要贡献` for people) if the source adds nuance; if the source contradicts an existing claim, add `> ⚠️ 与 [[…]] 中的说法不同：…` rather than overwriting.
6. Update `index.md` with new entries under their type section.
7. Append to `log.md`:
   ```
   ## [YYYY-MM-DD] ingest | <lesson title>
   - 新建：来源(1) 工具(N) 概念(N) 人物(N) 著作(N)
   - 更新：<list of updated pages>
   - 备注：<optional notes>
   ```
8. Report to user: number of pages touched, anything to revise.

### Edge cases

- Source unparseable → stop, report, write nothing.
- Ambiguous entity → fuzzy-match aliases first; ask user if unresolved.
- Contradicting an existing claim → never silently overwrite. Use `⚠️` flag, surface in Step 8.

### Image handling

The user binds Obsidian's "Download attachments for current file" command to a hotkey; downloaded images land in `raw/assets/`. You don't auto-trigger this. When images exist locally, you may view them for additional context.

## 6. 工作流：query

User asks a question in chat.

1. Read `index.md` first to find candidate pages.
2. Read those pages.
3. Synthesize an answer with `[[wikilinks]]` to every page used.
4. Offer to file the answer back as a wiki page if synthesis is **non-trivial**: ≥200 words OR connects ≥2 concepts in a way not already documented. Default target is `概念/<descriptive-name>.md` with `type: concept`; pick a different folder only if the synthesis is fundamentally about a person/book/tool. Filed pages get their own `index.md` entry and a `synthesis-filed` log entry.

### Output formats (pick based on the question)

- **Markdown prose** — default for "what is X?", "explain Y".
- **Comparison table** — for "X vs Y".
- **Mermaid diagram** — for "show how A → B → C connect" (Obsidian renders natively).
- **Dataview block** — for queries over frontmatter (e.g., "all tools tagged `板块/基本世界观` with `sources: ≥3`").

### Citation rules

- Every claim links to its source page.
- Training-data context must be marked `(*not from wiki*)`.
- No silent web fallback. If wiki lacks something, surface it: log gap or ask before web-searching.

## 7. 工作流：lint

Trigger: user says "lint" or after ~10 ingests.

Checks:

1. Orphans — pages with zero inbound `[[wikilinks]]`.
2. Stubs — pages still at frontmatter + one-liner after ≥3 sources.
3. Missing pages — entities referenced inline without their own page.
4. Contradictions — `⚠️` flags from prior ingests, unresolved.
5. Stale claims — pages with `updated:` older than newest cited source.
6. Broken wikilinks — `[[X]]` with no matching file.
7. Frontmatter integrity — missing required fields, type mismatches, alias collisions.
8. Index drift — `index.md` entries not matching real files.

Output a markdown report. Do NOT auto-fix. End the report with 3-5 suggested investigations or sources to seek out.

## 8. 索引与日志格式

### `index.md`

```markdown
# Wiki Index

## 工具 (Tools)
- [[<name>]] — one-line summary

## 概念 (Concepts)
- [[<name>]] — one-line summary

## 人物 (People)
- [[<name>]] — one-line bio

## 著作 (Books)
- [[<name>]] — one-line summary

## 来源 (Sources)
- [[<lesson-title>]] — YYYY-MM-DD ingested
```

### `log.md`

Append-only. Each entry begins with a parseable header so `grep "^## \[" log.md | tail -10` works:

```
## [YYYY-MM-DD] <event-type> | <subject>
- <detail line>
- <detail line>
```

Event types: `ingest`, `query`, `lint`, `synthesis-filed`, `schema-update`.

## 9. 我不该做的事

- Write to `raw/`. Ever. Read only.
- Silently overwrite a contradicting claim. Always use `⚠️` and surface.
- Use training-data facts in answers without `(*not from wiki*)` marker.
- Create a duplicate page for an entity that already exists under an alias.
- Skip the Step 3 ingest checkpoint.
- Web-search without asking the user first.

## 10. 与你协作

- **Ingest checkpoint** (Step 3): I summarize what I found before writing pages. You redirect.
- **Synthesis-filing offer**: when a query produces non-trivial output, I offer to file it back.
- **Schema evolution**: when I notice a recurring pattern (e.g., a new page type emerging organically), I propose a `CLAUDE.md` update rather than silently changing my approach.
- **One source at a time** by default. Batch ingest only on explicit request.
