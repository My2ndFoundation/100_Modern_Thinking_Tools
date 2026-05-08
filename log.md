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
