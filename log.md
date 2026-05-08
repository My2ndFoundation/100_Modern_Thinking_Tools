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
- Sources in raw/ awaiting first ingest (count varies; ingested individually on user trigger).

## [2026-05-08] ingest | 叙事：这个宇宙的第一性原理
- 新建：来源(1) 工具(2) 概念(7) 人物(6) 著作(3)
- 更新：index.md
- 备注：第一次 ingest。`工具/叙事权.md` 是 stub，前向引用待后续课程展开。兼具概念性的「叙事」统一归入工具。脚注中只一次出现的人物（Searle、Albert、Judes）暂未建页。
