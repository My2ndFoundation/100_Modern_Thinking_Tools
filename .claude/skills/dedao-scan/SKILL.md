---
name: dedao-scan
description: Use when the user wants to find raw/ files that haven't been ingested yet, or asks "扫一下 raw"、"还有哪些没处理"、"批量 ingest"、"check for new sources"。Discovers new clippings in the DeDao-100 raw/ folder by diffing against .ingested.tsv, then dispatches /dedao-ingest one file at a time.
model: claude-sonnet-4-6
effort: low
---

# DeDao-100 Raw Scanner

## Overview

Two-job skill:
1. **Discover** — diff `raw/*.md` against `.ingested.tsv`; surface the unprocessed files.
2. **Dispatch** — for each new file, hand control to `/dedao-ingest`, which runs its own Step 3 user-checkpoint per source.

The state file (`.ingested.tsv`) is the single source of truth for "已处理"。It is written exclusively by `/dedao-ingest`. This skill only reads it.

## The Non-Negotiable Rules

- **One source at a time** by default (CLAUDE.md §10). Never start ingest #2 before ingest #1's checkpoint and writes are complete.
- **Never write to the state file from this skill.** Only `/dedao-ingest` appends. If a file appears "new" but is actually already processed, the bug is in the state file — fix it explicitly with the user, don't silently skip.
- **Never write to `raw/`.** This skill is read-only against `raw/`.
- **Do not invent new files in `raw/`.** This skill discovers; it does not create.

## Workflow

**Step 1 — Compute the diff**

Run from the project root:

```bash
LC_ALL=C comm -23 \
  <(find raw -maxdepth 1 -type f -name '*.md' | LC_ALL=C sort) \
  <(grep -v '^#' .ingested.tsv | cut -f1 | LC_ALL=C sort)
```

Notes:
- **`LC_ALL=C` is mandatory on all three commands** (the two `sort`s and `comm`). Default zh_CN.UTF-8 locale collation is non-deterministic across CJK strings — without `LC_ALL=C` the diff silently mismatches and can both miss truly-new files AND falsely flag already-ingested files. (Real incident, 2026-05-10: it hid 发刊词 and falsely surfaced 选择偏差.) Either all three are byte-sorted or none are; don't mix.
- `-maxdepth 1` excludes `raw/assets/` (images, per CLAUDE.md §5).
- `comm -23` = lines only in the first input. Requires both inputs sorted (and sorted the SAME way — hence `LC_ALL=C` on every step).
- Use `cut -f1` on the TSV (not `awk` with regex), since BSD `awk` on macOS chokes on `!~/regex/` syntax. The `grep -v '^#'` strips the header block first.
- Filenames contain Chinese, colons, spaces — works fine in bash; do NOT add `xargs` without `-d '\n'` or you will split on whitespace.

If `.ingested.tsv` does not exist: report it and stop. Ask the user whether to create an empty one (header + zero rows) — do not auto-create, because an empty state file means "nothing has ever been ingested", which may not be true.

**Step 2 — Report findings**

Format:

```
扫描结果（raw/ 共 N 个 .md，已处理 M 个）

新文件 (N - M)：
  1. raw/<name>.md
  2. raw/<name>.md
  ...
```

If `N - M == 0`: report "全部已处理 ✅" and stop. Do not invoke `/dedao-ingest`.

**Step 3 — Confirm scope with the user**

Ask explicitly:
- 全部按列出顺序逐一 ingest？
- 只挑某几个？(让用户报序号)
- 调整顺序？(e.g. 按板块归组)

**Wait for the user's answer.** Do not start ingest until scope is confirmed. The user may also want to defer some files (e.g. waiting on more raw clippings to land first).

**Step 4 — Dispatch sequentially**

For each file in the confirmed list, invoke the ingest skill:

```
/dedao-ingest raw/<filename>.md
```

Then **let `/dedao-ingest` run end-to-end**, including its Step 3 user-checkpoint and its Step 8 state-file write. Only after it completes (and the user has not asked to stop) do you move to the next file.

Between files, give a one-line breadcrumb: `→ 进入第 K/N 篇：<filename>`. Nothing more — the ingest skill owns its own narration.

**Step 5 — Final tally**

After the last file (or when the user says stop), report:
- 本次完成：K 篇
- 跳过/未处理：剩余文件清单
- 是否仍有 `raw/assets/` 下未匹配的图片需要清理（信息性提示，不动手）

## Edge Cases

| Situation | Handling |
|---|---|
| `.ingested.tsv` missing | Stop, report, ask user how to bootstrap. Don't assume "nothing ingested". |
| State file lists a `raw/X.md` that no longer exists | Surface as warning ("state references missing raw/X.md") — likely renamed. Ask before editing the state file. |
| Two raw files differ only by ` - 得到APP` suffix | Treat as two different files. The user's filename is authoritative. |
| Raw file lacks the standard ` - 得到APP.md` suffix (e.g. `raw/能动：稳态生存的观念陷阱.md`) | Process normally. Suffix is descriptive, not required. |
| User asks for "all" but there are >5 new files | Confirm again before starting. Sequential ingests with checkpoints take real time and attention. |
| User wants to ingest something that's already in the state file | Don't silently re-ingest. Ask why — possible reasons: source page was deleted, raw file was updated. Surface. |

## Common Mistakes

| Mistake | Fix |
|---|---|
| Writing to `.ingested.tsv` from this skill | State writes belong to `/dedao-ingest`. This skill is a reader. |
| Calling `/dedao-ingest` for file #2 before file #1's checkpoint completes | One source at a time. Wait. |
| Skipping the Step 3 user-confirmation and auto-processing all | The user may want to triage by 板块 or postpone — ask. |
| Suppressing the diff command's output and "summarizing" instead | Show the actual file list. The user needs to see it. |
| Using `find raw -name '*.md'` without `-maxdepth 1` | Will descend into `raw/assets/` and pick up image-adjacent markdown if any. Stay shallow. |
| Trying to process the diff with `xargs` on whitespace | Filenames contain spaces. Use `read -r` or pass to a shell loop. |

## Red Flags — STOP

- About to call `Write` / `Edit` on `.ingested.tsv`
- About to call `/dedao-ingest` for the next file before the previous one finished
- About to call `/dedao-ingest` without first showing the user the diff list
- About to declare "all done" while skipping files without user consent
