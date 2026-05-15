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
verified: YYYY-MM-DD   # optional; date the page was source-verified by /dedao-verify
sources: <integer count of sources mentioning this>
tags: [板块/<section name>]
---
```

`verified:` is added/maintained by `/dedao-verify` only (see §11). Absence means
the page has not yet been source-verified.

Standard sections by type:

### `工具/<name>.md`
- 一句话定义
- 简介 (encyclopedic summary from trusted sources — added/maintained by /dedao-verify, §11)
- 来源 (which sources introduce/discuss it)
- 何时使用
- 操作步骤
- 例子
- 相关工具
- 出现在 (auto-maintained list of source pages)
- 外部参考 (2–4 trusted-source links — added/maintained by /dedao-verify, §11)

### `概念/<name>.md`
- 一句话定义
- 简介 (encyclopedic summary from trusted sources — added/maintained by /dedao-verify, §11)
- 来源
- 详细解释
- 相关概念
- 相关工具
- 出现在
- 外部参考 (2–4 trusted-source links — added/maintained by /dedao-verify, §11)

### `人物/<name>.md`
- 简介 (one paragraph; this IS the person page's lead section — there is no separate
  一句话定义. /dedao-verify revises/enriches this section in place, never adds a duplicate.)
- 主要贡献
- 相关概念
- 相关著作
- 在哪些课程出现
- 外部参考 (2–4 trusted-source links — added/maintained by /dedao-verify, §11)

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
- 原文 (verbatim raw lecture body — see §5 「原文 insertion」for what to strip and what to keep. The wiki publishes as static HTML; `raw/` is not exposed, so 来源 pages MUST be self-contained.)

## 4. 命名约定

- Page titles in Chinese (中文). Filenames match titles.
- Cross-language names go in `aliases: []`. Example: `人物/卡尔·弗里斯顿.md` has `aliases: [Karl Friston, 弗里斯顿]`.
- One entity = one page. Before creating a new page, search aliases across the wiki for existing matches. If you find a match under a different name, link to it — never duplicate.
- Frontmatter `type:` values are English enums (`tool | concept | person | book | source`) — stable, queryable. Folder names and human-readable counts in logs/reports use Chinese (`工具/`, `工具(N)`). The two systems coexist by design.

## 5. 工作流：ingest

Trigger: user drops a file in `raw/` and says "ingest" (or names the file).

1. Read the source end-to-end — both the **frontmatter** (clipping metadata) and the body.
2. Extract:
   - Tools introduced, concepts referenced, people named, books/papers cited, course section, lesson's main argument (from the body).
   - **Frontmatter back-reference wikilinks** (e.g. `author: - "[[万维钢·现代思维⼯具100讲]]"`) — collect the EXACT string as it appears, including any special characters (e.g. CJK radical `⼯` U+2F2F vs. normal `工` U+5DE5). Do NOT normalize — instead, add the raw spelling as an alias on the corresponding 著作 page so Obsidian resolves these backlinks. Multiple raw files share these backlinks; one alias fixes all of them.
3. **Checkpoint**: report extracted entities + frontmatter backlinks + a one-paragraph summary in chat. Wait for the user to redirect emphasis or scope.
4. Write `来源/<lesson-title>.md` per the template above. All entities as `[[wikilinks]]`. Insert the raw body verbatim under `## 原文` per the rules below.
5. For each entity:
   - **New** → create a stub with: frontmatter + the type-specific top-level section headings (from §3) left empty, populating only `一句话定义` and `## 出现在` (which lists this source). Stubs grow into full pages as more sources are ingested.
   - **Existing** → append source under `## 出现在`; update relevant content sections (e.g., `详细解释` for concepts, `何时使用` / `操作步骤` for tools, `主要贡献` for people) if the source adds nuance; if the source contradicts an existing claim, add `> ⚠️ 与 [[…]] 中的说法不同：…` rather than overwriting.

#### Stub example

When ingesting a new source that introduces 叙事 as a tool, the stub `工具/叙事.md` looks like:

```markdown
---
type: tool
aliases: [narrative]
created: 2026-05-08
updated: 2026-05-08
sources: 1
tags: [板块/基本世界观]
---

## 一句话定义
对互相关联的一系列事实的连贯描述。

## 来源

## 何时使用

## 操作步骤

## 例子

## 相关工具

## 出现在
- [[叙事：这个宇宙的第一性原理]]
```

All type-specific section headings (`来源`, `何时使用`, etc., per §3) are present as scaffolding even though most are empty. Subsequent ingests fill them in.

6. Update `index.md` with new entries under their type section.
7. Append to `log.md`:
   ```
   ## [YYYY-MM-DD] ingest | <lesson title>
   - 新建：来源(1) 工具(N) 概念(N) 人物(N) 著作(N)
   - 更新：<list of updated pages>
   - 备注：<optional notes>
   ```

   Note: `来源(1)` is always exactly `1` because each ingest creates one source page; the other type counts vary.

8. Report to user: number of pages touched, anything to revise. Suggest running
   `/dedao-verify` afterwards to source-verify & enrich the new/updated entities
   (§11) — ingest itself stays unchanged and does not block on this.

### 原文 insertion (Step 4)

The 来源 page must be self-contained because static-HTML publish does not expose `raw/`. Insert the verbatim raw body under a final `## 原文` section, with a small provenance preamble.

**Strip:**
- Raw frontmatter (lines between `---` delimiters) — clipping metadata, not content.
- The duplicate title+duration line at the very top of the body (e.g. `叙事：这个宇宙的第一性原理 12分56秒`).
- The `转述：怀沙AI` line.
- The App UI line `已添加到笔记`.

**Keep verbatim** (no rewording, no fixing typos):
- The lecture body, paragraph breaks, `✵` separators.
- 收束小诗.
- 注释 / footnote block — promote `注释` to `### 注释` for HTML rendering.
- 划重点 — promote to `### 划重点`.

**Image references** — do NOT keep the external `piccdn2.umiwi.com` URL inline. Localize per the 图片本地化 subsection below. The CDN may expire; static-HTML publish needs local files.

**Preamble (you write):**
```
## 原文

> 来源：<source URL from raw frontmatter>
> 出处：[[现代思维工具100讲]] · <duration>　<presenter line if present>
```

### 图片本地化 (Step 4)

External CDN images in raw bodies (e.g. `https://piccdn2.umiwi.com/...`) MUST be downloaded to the vault and the body rewritten to reference local paths. Reasons: (a) CDN URLs can expire, (b) static-HTML publish needs self-contained assets.

**Path convention:** `assets/<lesson-title>/NN.<ext>` (root-level `assets/`, one subfolder per source).

- `<lesson-title>` — the same string as the 来源 page filename, without the `.md` extension. Chinese characters are fine; Obsidian and Quartz both resolve unicode paths.
- `NN` — sequential, zero-padded, in document order: `01`, `02`, `03`, ...
- `<ext>` — preserve from URL (`.png`, `.webp`, `.jpeg`). Do not transcode.

**Download recipe** (run from project root):

```bash
mkdir -p "assets/<lesson-title>"
[ -f "assets/<lesson-title>/01.png" ] || curl -fsSL --create-dirs \
  -o "assets/<lesson-title>/01.png" \
  "<url>"
```

The `[ -f ... ] ||` guard makes it idempotent (re-running ingest won't re-download).

**Reference rewrite in `## 原文`:** replace the original `![](https://piccdn2…)` with:

```markdown
![](assets/<lesson-title>/NN.<ext>)
<!-- src: <original URL> -->
```

The `<!-- src: ... -->` comment preserves provenance so you (or the user) can re-fetch later. The comment doesn't render in HTML.

**Failure handling:** if `curl` fails (404, timeout, etc.), do NOT silently drop the image. Keep the original URL inline AND prepend a flag:

```markdown
<!-- ⚠️ download failed: <url> -->
![](<url>)
```

Surface the failure list in Step 9 report.

**Two `assets/` folders, two purposes** (no overlap):
| Folder | Writer | Purpose |
|---|---|---|
| `raw/assets/` | User (Obsidian hotkey) | User's personal reading copies. LLM does not write here. |
| `assets/` (root) | LLM (this step) | Canonical, vault-rooted, referenced by `来源` pages. Published in static HTML. |

### Edge cases

- Source unparseable → stop, report, write nothing.
- Ambiguous entity → fuzzy-match aliases first; ask user if unresolved.
- Contradicting an existing claim → never silently overwrite. Use `⚠️` flag, surface in Step 8.
- Frontmatter back-reference uses a special character (e.g. `⼯` U+2F2F instead of `工` U+5DE5) → add the special-character form as an alias on the target wiki page; never silently rewrite to the "correct" character. The raw file is the authority on its own backlinks.

### Image handling

Two distinct flows; see also「图片本地化」above.

- **User-side reading** — User binds Obsidian's "Download attachments for current file" command to a hotkey; downloaded images land in `raw/assets/`. You don't auto-trigger this. When images exist locally there, you may view them for context. Never write to `raw/assets/`.
- **LLM-side ingest** — During Step 4, you download every external image referenced in the raw body to `assets/<lesson-title>/NN.<ext>` and rewrite the `## 原文` body to point at local paths. See「图片本地化」for the exact recipe.

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
- No silent web fallback **in query/ingest**. If the wiki lacks something, surface it:
  log the gap or ask before web-searching. Exception: `/dedao-verify` (§11) is a
  sanctioned online mode — web access there is expected and explicit, not a silent
  fallback; its web-sourced facts are inline-cited with `（[来源](url)）`, not marked
  `(*not from wiki*)`.

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
9. Unverified pages — 工具/概念/人物 pages with no `verified:` (or absent from `.verified.tsv`).
10. Stale verification — pages whose `verified:` predates the newest cited source's
    `updated:`, or unresolved `⚠️` flags from `/dedao-verify` in 溯源验证报告.md.

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

Event types: `ingest`, `query`, `lint`, `synthesis-filed`, `schema-update`, `verify`.

## 9. 我不该做的事

- Write to `raw/`. Ever. Read only.
- Silently overwrite a contradicting claim. Always use `⚠️` and surface.
- Use training-data facts in answers without `(*not from wiki*)` marker.
- Create a duplicate page for an entity that already exists under an alias.
- Skip the Step 3 ingest checkpoint.
- Web-search without asking the user first.
- Skip the `## 原文` insertion in 来源 pages — they must be self-contained for static-HTML publish.
- Normalize special characters in raw frontmatter backlinks (e.g. `⼯` → `工`). Add the raw form as an alias instead.
- Leave external CDN image URLs (e.g. `piccdn2.umiwi.com`) inline in `## 原文` — always localize to `assets/<lesson-title>/NN.<ext>` per §5「图片本地化」.
- Write into `raw/assets/` — that folder is for the user's Obsidian hotkey only. LLM-managed images go to root `assets/`.
- Reorder/dedupe/rewrite prior rows in `.verified.tsv` — it is append-only (like `.ingested.tsv`). If a prior row is wrong, surface it; don't silently rewrite.
- Silently overwrite a claim that contradicts a trusted source during `/dedao-verify`. Only obvious typos (拼写/年份/人名译名/机构名) get a direct fix with an inline `<!-- 溯源订正 … -->` note; genuine factual/interpretive divergence gets a `⚠️` flag with the source link, original kept, surfaced in 溯源验证报告.md.

## 10. 与你协作

- **Ingest checkpoint** (Step 3): I summarize what I found before writing pages. You redirect.
- **Synthesis-filing offer**: when a query produces non-trivial output, I offer to file it back.
- **Schema evolution**: when I notice a recurring pattern (e.g., a new page type emerging organically), I propose a `CLAUDE.md` update rather than silently changing my approach.
- **One source at a time** by default. Batch ingest only on explicit request.

## 11. 工作流：verify（溯源验证 + 内容充实）

Trigger: user says "溯源"、"verify"、"核实"、`/dedao-verify`, or names a page under
`工具/`、`概念/`、`人物/`. Owned by the `/dedao-verify` skill
(`.claude/skills/dedao-verify/SKILL.md`); single-page SOP in
`docs/agent-prompts/dedao-verify-page.md`; design in
`docs/superpowers/specs/2026-05-15-dedao-verify-design.md`.

Scope: `工具/`、`概念/`、`人物/` only (not `著作/`、`来源/`). Per page, against trusted
sources (维基百科优先 en / 机构·官网·官方传记 / 同行评议期刊 / 可信新闻):

1. Verify definition, attribution, years, key facts/formula; people pages also
   生卒/国籍/机构/贡献/代表作.
2. Obvious typo → direct fix + inline `<!-- 溯源订正 YYYY-MM-DD: 原作「X」，据 <url> 改为「Y」 -->`.
   Factual/interpretive divergence → `> ⚠️ 与权威信源不同：…（[信源](url)）`, original kept.
3. Add/maintain `## 简介` (encyclopedic summary, just below `## 一句话定义`; on 人物
   pages the existing lead 简介 is revised in place — never duplicated).
4. Fill genuinely thin standard sections (1–2 sourced paragraphs, each `（[来源](url)）`).
5. Add/merge `## 外部参考` (2–4 trusted links).
6. Frontmatter: bump `updated:`, set `verified:`; add authoritative English `aliases:`.

State: append-only `.verified.tsv` (`<page>\t<date>\tverified`, header + diff recipe
inside the file, like `.ingested.tsv`). Batch run = type-split batches ≤30 pages,
waves ≤5 concurrent sub-agents; **pilot ~12 pages + user checkpoint before full run**
when >~30 pages. Sub-agents touch only their batch pages — never `index.md`/`log.md`/
`CLAUDE.md`/`.verified.tsv`/`raw/`. Orchestrator aggregates into `溯源验证报告.md`
(订正表 + ⚠️ 清单 + 未能验证) and one `log.md` `verify` event. Never auto-commit;
leave the tree dirty for review.
