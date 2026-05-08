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

## [2026-05-08] schema-update | 图片本地化（assets/<lesson>/NN.ext）
- CLAUDE.md §5「原文 insertion」改：image refs 不再 leave-as-is，必须本地化
- CLAUDE.md §5 新子节「图片本地化」：路径约定 `assets/<lesson-title>/NN.<ext>`、curl 配方、idempotent guard、失败处理（保 URL + ⚠️ 标志）、两个 assets/ 目录的边界
- CLAUDE.md §5 image handling 子节改写：拆成「user-side reading（raw/assets/）」与「LLM-side ingest（assets/）」两个流
- CLAUDE.md §9 加两条禁令（不留 CDN URL、不写 raw/assets/）
- dedao-ingest SKILL Step 4 加 image localization mandatory；Common Mistakes / Red Flags 同步
- README 新增两行（assets/、raw/assets/）说明
- 回填 `来源/叙事：这个宇宙的第一性原理.md` 4 张图：→ `assets/叙事：这个宇宙的第一性原理/01.png` (1.6M) / 02.png (9.2M) / 03.webp (98K) / 04.jpeg (122K)，原 URL 保留为 `<!-- src: ... -->` 注释
- 备注：02.png 9.2 MB 偏大，未来可考虑加 image-optimize 步骤；当前规则是「不转码不压缩」。

## [2026-05-08] schema-update | skills、状态文件、原文自包含、frontmatter backlink 处理
- 新增 `.claude/skills/dedao-ingest/SKILL.md`、`.claude/skills/dedao-scan/SKILL.md`、`.claude/state/ingested.tsv`、`README.md`
- CLAUDE.md §3 来源 模板加 `## 原文`；§5 Step 2 加 frontmatter backlink 抽取规则、新子节「原文 insertion」、edge case 加特殊字符 backlink；§9 加两条禁令（跳过 `## 原文`、规范化特殊字符）
- 修 `著作/现代思维工具100讲.md` aliases 加 `万维钢·现代思维⼯具100讲`（CJK 部首区 ⼯ U+2F2F）— 让 raw frontmatter 的反向链接能解析
- 删除根目录空文件 `万维钢·现代思维⼯具100讲.md`（Obsidian 自动生成的悬空 stub，未跟踪）
- 回填 `来源/叙事：这个宇宙的第一性原理.md` 的 `## 原文` 段
- 备注：未来 14 篇 ingest 必须用新 skill 流程（含 `## 原文` 段 + backlink alias 处理）。静态 HTML 发布前提：来源页自包含。
