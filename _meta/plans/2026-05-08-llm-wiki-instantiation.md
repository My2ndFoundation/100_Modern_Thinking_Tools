# LLM Wiki Instantiation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a working LLM-maintained Chinese-language wiki for the DeDao 100 Thinking Tools course in this Obsidian vault, ready to ingest its first source.

**Architecture:** Three layers — immutable `raw/` sources, LLM-owned wiki folders (`来源/`, `工具/`, `概念/`, `人物/`, `著作/`), and a `CLAUDE.md` schema that drives ingest/query/lint workflows. All wiki content in Chinese, interlinked via Obsidian `[[wikilinks]]`.

**Tech Stack:** Markdown, YAML frontmatter, Obsidian (UI), git (version history). No code, no build system. Plain files.

**Spec:** `_meta/specs/2026-05-08-llm-wiki-instantiation-design.md`

**Working directory:** `/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools/`

---

## Task 1: Folder scaffolding

Create the five wiki folders plus `raw/assets/`, each with a `.gitkeep` so git tracks them while empty.

**Files:**
- Create: `来源/.gitkeep`
- Create: `工具/.gitkeep`
- Create: `概念/.gitkeep`
- Create: `人物/.gitkeep`
- Create: `著作/.gitkeep`
- Create: `raw/assets/.gitkeep`

- [ ] **Step 1: Create folders and gitkeep files**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
mkdir -p 来源 工具 概念 人物 著作 raw/assets
touch 来源/.gitkeep 工具/.gitkeep 概念/.gitkeep 人物/.gitkeep 著作/.gitkeep raw/assets/.gitkeep
```

- [ ] **Step 2: Verify the structure**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
ls -d 来源 工具 概念 人物 著作 raw/assets && find . -name .gitkeep -not -path "./.git/*"
```

Expected output: six directory names, then six `.gitkeep` paths under those directories.

- [ ] **Step 3: Stage and commit**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
git add 来源/.gitkeep 工具/.gitkeep 概念/.gitkeep 人物/.gitkeep 著作/.gitkeep raw/assets/.gitkeep
git commit -m "$(cat <<'EOF'
chore: scaffold wiki folder structure

Five Chinese-named wiki folders (来源/工具/概念/人物/著作) plus raw/assets/
for downloaded images. .gitkeep files so git tracks empty dirs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds, `git log --oneline` shows 2 commits.

---

## Task 2: Write CLAUDE.md schema

This is the centerpiece file — it tells future LLM sessions how to operate the wiki. Place at vault root.

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write CLAUDE.md with the full schema**

Create file `/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools/CLAUDE.md` with exactly this content:

````markdown
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
- 在哪些课程被引用

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

## 5. 工作流：ingest

Trigger: user drops a file in `raw/` and says "ingest" (or names the file).

1. Read the source end-to-end.
2. Extract: tools introduced, concepts referenced, people named, books/papers cited, course section, lesson's main argument.
3. **Checkpoint**: report extracted entities + a one-paragraph summary in chat. Wait for the user to redirect emphasis or scope.
4. Write `来源/<lesson-title>.md` per the template above. All entities as `[[wikilinks]]`.
5. For each entity:
   - **New** → create stub: frontmatter + 一句话定义 + `## 出现在` listing this source.
   - **Existing** → append source under `## 出现在`; refine 详细解释 if the source adds nuance; if the source contradicts an existing claim, add `> ⚠️ 与 [[…]] 中的说法不同：…` rather than overwriting.
6. Update `index.md` with new entries under their type section.
7. Append to `log.md`:
   ```
   ## [YYYY-MM-DD] ingest | <lesson title>
   - 新建：工具(N) 概念(N) 人物(N) 著作(N)
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
4. Offer to file the answer back if synthesis is **non-trivial**: ≥200 words OR connects ≥2 concepts in a way not already documented.

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
````

- [ ] **Step 2: Verify section count and structure**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
grep -c "^## [0-9]\+\." CLAUDE.md
```

Expected output: `10` (ten top-level numbered sections, matching spec §6).

- [ ] **Step 3: Verify the "do not" list contains the critical rules**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
grep -A 8 "^## 9\." CLAUDE.md | grep -E "^- " | wc -l
```

Expected output: `6` (six "do not" rules under §9).

- [ ] **Step 4: Stage and commit**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
feat: add CLAUDE.md schema for LLM-maintained wiki

Ten-section schema covering three-layer architecture, page conventions
per type, ingest/query/lint workflows, naming rules, and collaboration
checkpoints. Drives all future LLM sessions on this vault.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

---

## Task 3: Write index.md catalog

Empty catalog template that ingest will populate. The LLM reads this first when answering queries.

**Files:**
- Create: `index.md`

- [ ] **Step 1: Write index.md**

Create file `/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools/index.md` with exactly this content:

```markdown
# Wiki Index

> Catalog of every wiki page, organized by type. Auto-maintained on every ingest. The LLM reads this first when answering queries.
>
> Format per entry: `- [[<name>]] — one-line summary`

## 工具 (Tools)

_None yet._

## 概念 (Concepts)

_None yet._

## 人物 (People)

_None yet._

## 著作 (Books)

_None yet._

## 来源 (Sources)

_None yet._
```

- [ ] **Step 2: Verify the five type sections exist**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
grep "^## " index.md
```

Expected output (five lines, in this order):
```
## 工具 (Tools)
## 概念 (Concepts)
## 人物 (People)
## 著作 (Books)
## 来源 (Sources)
```

- [ ] **Step 3: Stage and commit**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
git add index.md
git commit -m "$(cat <<'EOF'
feat: add empty index.md catalog with five type sections

Read-first entry point for query workflow. Populated by ingest.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

---

## Task 4: Write log.md with bootstrap entry

Append-only event log, with one bootstrap entry recording the instantiation itself so the wiki's history starts at day zero.

**Files:**
- Create: `log.md`

- [ ] **Step 1: Write log.md**

Create file `/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools/log.md` with exactly this content:

```markdown
# Wiki Log

> Append-only. Each entry header is `## [YYYY-MM-DD] <event-type> | <subject>` so the log is greppable: `grep "^## \[" log.md | tail -10`.
>
> Event types: `ingest`, `query`, `lint`, `synthesis-filed`, `schema-update`.

---

## [2026-05-08] schema-update | initial wiki instantiation
- Created folder structure: 来源/, 工具/, 概念/, 人物/, 著作/, raw/assets/
- Wrote CLAUDE.md (10 sections per spec §6)
- Wrote index.md catalog template (5 type sections)
- Wrote log.md (this file)
- Spec: `_meta/specs/2026-05-08-llm-wiki-instantiation-design.md`
- Plan: `_meta/plans/2026-05-08-llm-wiki-instantiation.md`
- Sources in raw/ awaiting ingest: 1 (`叙事：这个宇宙的第一性原理 - 得到APP.md`)
```

- [ ] **Step 2: Verify the bootstrap entry parses**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
grep "^## \[" log.md
```

Expected output:
```
## [2026-05-08] schema-update | initial wiki instantiation
```

- [ ] **Step 3: Stage and commit**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
git add log.md
git commit -m "$(cat <<'EOF'
feat: add log.md with bootstrap schema-update entry

Append-only event log. Bootstrap entry records the instantiation itself
so day-zero is captured. Greppable headers per CLAUDE.md §8.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

---

## Task 5: Final verification

Confirm the wiki is structurally complete and ready for first ingest.

- [ ] **Step 1: Verify all deliverables exist**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
ls CLAUDE.md index.md log.md .gitignore && ls -d 来源 工具 概念 人物 著作 raw/assets _meta/specs _meta/plans
```

Expected output: all four files listed, then all eight directories listed. No errors.

- [ ] **Step 2: Verify git history captures every step**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
git log --oneline
```

Expected output: 5 commits (oldest at bottom):
1. `feat: add log.md with bootstrap schema-update entry`
2. `feat: add empty index.md catalog with five type sections`
3. `feat: add CLAUDE.md schema for LLM-maintained wiki`
4. `chore: scaffold wiki folder structure`
5. `docs: add LLM Wiki instantiation design spec`

- [ ] **Step 3: Confirm working tree is clean (except known untracked)**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
git status
```

Expected: branch `main`, untracked items will include `.obsidian/` (intentionally gitignored at the user's discretion), `raw/叙事：这个宇宙的第一性原理 - 得到APP.md` (the existing source, awaiting ingest), and possibly an Obsidian-auto-stub `万维钢·现代思维⼯具100讲.md` at the root. No tracked-file modifications.

- [ ] **Step 4: Report to user**

Send a chat message:
> Wiki instantiation complete. 5 commits on `main`. Next step: drop a `/ingest` (or say "ingest the existing 叙事 source") to test the workflow end-to-end. The untracked `raw/<source>.md` and `万维钢·现代思维⼯具100讲.md` are intentionally left for you to curate before tracking.

---

## Self-review

**Spec coverage check** (against `_meta/specs/2026-05-08-llm-wiki-instantiation-design.md`):

- §2 Architecture (folders, frontmatter): Task 1 (folders), Task 2 (frontmatter spec in CLAUDE.md §3) ✓
- §3 Ingest workflow: Task 2 (CLAUDE.md §5) ✓
- §4 Query workflow: Task 2 (CLAUDE.md §6) ✓
- §5 Lint workflow: Task 2 (CLAUDE.md §7) ✓
- §6 CLAUDE.md outline (10 sections): Task 2, verified by section-count grep ✓
- §7 Deliverables (CLAUDE.md, index.md, log.md, folders w/ gitkeeps, .gitignore, git init): Task 1-4 (gitignore + git init already done pre-plan) ✓
- §8 Out of scope (search/Marp/personal layer/batch): not implemented, as intended ✓

**Placeholder scan**: no TBD/TODO/"implement later"/vague handlers in any task.

**Type/name consistency**: folder names (来源/工具/概念/人物/著作), file names (CLAUDE.md/index.md/log.md), event types (ingest/query/lint/synthesis-filed/schema-update), and frontmatter keys are consistent across all tasks.

**Scope**: single instantiation; no decomposition needed. The first ingest is explicitly out of scope (left to user trigger), keeping this plan tight.
