# LLM Wiki Instantiation — Design Spec

**Date:** 2026-05-08
**Vault:** DeDao-100 Modern Thinking Tools
**Source:** 万维钢《现代思维工具课》(DeDao app), 100 lessons across 6 sections

## 1. Goal

Instantiate the LLM Wiki pattern (persistent, LLM-maintained knowledge base) for this Obsidian vault. The wiki should support deep cross-referenced exploration of the 100 thinking tools, the thinkers behind them, and the works they cite — language: Chinese (中文).

Primary use case: **mapping how ideas connect** — graph-style exploration of tools, concepts, people, and books, in the spirit of fan wikis like Tolkien Gateway.

## 2. Architecture

Three layers:

- **Raw** (`raw/`) — immutable source files clipped from DeDao (one per lesson). LLM reads only.
- **Wiki** (top-level Chinese-named folders) — markdown pages owned and maintained by LLM. Interlinked via Obsidian `[[wikilinks]]`.
- **Schema** (`CLAUDE.md` at vault root) — instructions the LLM follows. Co-evolved with the user.

### Directory layout

```
DeDao-100 Modern Thinking Tools/
├── CLAUDE.md
├── index.md                 # content catalog, auto-maintained
├── log.md                   # append-only event log
├── raw/                     # immutable sources
│   └── assets/              # downloaded images
├── 来源/                     # one summary per ingested lesson
├── 工具/                     # the 100 thinking tools
├── 概念/                     # abstract ideas spanning multiple tools
├── 人物/                     # thinkers (course author + cited)
├── 著作/                     # cited books / papers
└── _meta/
    └── specs/               # this design spec lives here
```

### Frontmatter (every wiki page)

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

Course sections become tags (`板块/基本世界观`, etc.), not folders, since they are for navigation rather than linking.

## 3. Ingest workflow

Trigger: user drops a new file in `raw/` and says "ingest" (or equivalent).

1. **Read** the source end-to-end.
2. **Extract**: tools introduced, concepts referenced, people named, books/papers cited, course section, lesson's main argument.
3. **Checkpoint with user**: report extracted entities + one-paragraph summary; user redirects emphasis or scope.
4. **Write source summary** at `来源/<lesson-title>.md` with sections: 一句话总结 / 核心论点 / 关键概念 / 引用人物与著作 / 与其他课程的连接 / 我的反应 (left blank for user). All entities linked via `[[…]]`.
5. **Update wiki pages** for every entity touched:
   - New page → stub: frontmatter + one-line definition + `## 出现在` listing this source.
   - Existing page → append source under `## 出现在`; refine definition if the source adds nuance; flag contradictions inline with `> ⚠️ 与 [[…]] 中的说法不同：…` rather than silently overwriting.
6. **Update `index.md`** with new entries, organized by type.
7. **Append `log.md` entry**, format:
   ```
   ## [YYYY-MM-DD] ingest | <lesson title>
   - 新建：工具(N) 概念(N) 人物(N) 著作(N)
   - 更新：<list>
   - 备注：<optional>
   ```
8. **Report back** in chat: pages touched, anything to revise.

### Image handling

Optional. User binds Obsidian's "Download attachments for current file" command to a hotkey; downloaded images land in `raw/assets/`. LLM does not auto-trigger this. When images exist locally, LLM may view them for additional context.

### Edge cases

- Source unparseable → stop, report, write nothing.
- Ambiguous entity → fuzzy-match by aliases first; ask user if unresolved.
- Contradiction with existing claim → never silently overwrite; use `⚠️` flag and surface in Step 8 report.

## 4. Query workflow

User asks a question in chat. LLM answers from the wiki, not training data.

1. Read `index.md` to find candidate pages.
2. Read those pages.
3. Synthesize an answer with `[[wikilinks]]` to every page drawn from.
4. Offer to file the answer back as a wiki page if synthesis is non-trivial.

### Output formats (LLM picks based on question)

- **Markdown prose** — default for "what is X?", "explain Y".
- **Comparison table** — for "X vs Y".
- **Mermaid diagram** — for "show how A → B → C connect".
- **Dataview block** — for queries over frontmatter (e.g., "all tools tagged 板块/基本世界观 with ≥3 sources").

### Filing answers back

Non-trivial syntheses (e.g., a 400-word answer connecting two concepts) are offered for filing as a real wiki page (`概念/<name>.md`), with frontmatter and log entry. Trivial answers are not filed.

### Citation rules

- Every claim links to its source page.
- If the LLM uses training-data context (e.g., explaining who Friston is beyond what the wiki says), it must mark with `(*not from wiki*)`.
- No silent web fallback. If wiki lacks something, surface it: either log a gap for future ingest or ask before web-searching.

## 5. Lint workflow

Trigger: user says "lint" or after every ~10 ingests.

Checks:

1. **Orphans** — pages with zero inbound `[[wikilinks]]`.
2. **Stubs** — pages still at frontmatter + one-liner after ≥3 sources.
3. **Missing pages** — entities referenced inline without their own page.
4. **Contradictions** — `⚠️` flags from prior ingests, unresolved.
5. **Stale claims** — pages with `updated:` older than their newest cited source.
6. **Broken wikilinks** — `[[X]]` with no matching file.
7. **Frontmatter integrity** — missing required fields, type mismatches, alias collisions.
8. **Index drift** — `index.md` entries that don't match real files.

LLM produces a markdown report; does not auto-fix. Report ends with 3-5 suggested investigations or sources to seek out.

## 6. CLAUDE.md outline

The schema file at vault root, ~200 lines:

1. 项目概述 — one paragraph.
2. 三层架构 — raw / wiki / schema reminder.
3. 页面规范 — required frontmatter and standard sections per page type:
   - `工具/`: 一句话定义 / 来源 / 何时使用 / 操作步骤 / 例子 / 相关工具
   - `概念/`: 一句话定义 / 来源 / 详细解释 / 相关概念 / 相关工具
   - `人物/`: 简介 / 主要贡献 / 相关概念 / 在哪些课程出现
   - `著作/`: 作者 / 简介 / 核心论点 / 在哪些课程被引用
   - `来源/`: (sections listed above in §3 step 4)
4. 命名约定 — Chinese page titles; aliases for English/alt names; one entity = one page.
5. 工作流：ingest — the §3 checklist.
6. 工作流：query — the §4 rules.
7. 工作流：lint — the §5 checks.
8. 索引与日志格式 — exact format for `index.md` and `log.md` entries.
9. 我不该做的事 — never write to `raw/`; never silently overwrite contradictions; never use training-data facts without `(*not from wiki*)`; never create duplicate pages for known aliases.
10. 与你协作 — Step 3 checkpoint in ingest; offer to file syntheses; ask before web-searching.

## 7. Deliverables

Files created on first run:

- `CLAUDE.md` — full schema file per §6.
- `index.md` — empty catalog with type sections.
- `log.md` — empty log with header.
- `_meta/specs/2026-05-08-llm-wiki-instantiation-design.md` — this document.
- Empty folders: `来源/`, `工具/`, `概念/`, `人物/`, `著作/`, `raw/assets/` (each with a `.gitkeep`).
- `.gitignore` — Obsidian workspace cache.

Git: `git init` on vault root, initial commit captures all of the above.

## 8. Out of scope (for first instantiation)

- Search engine integration (qmd or similar) — defer until wiki has ≥30 pages.
- Marp slide generation — only if user requests later.
- Personal-application layer (user's reflections beyond the `我的反应` field in source pages).
- Auto-ingest batch mode — single-source manual ingest only.

## 9. Open items for evolution

- Whether course section pages (e.g., `板块/基本世界观.md`) eventually deserve their own pages rather than just tags. Revisit after ~20 ingests.
- Whether to maintain English alias index for cross-language search. Defer.
- Whether to add a `应用/` (applications) folder if the user starts logging real-life applications. Defer until requested.
