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

## [2026-05-08] ingest | WOOP：从生活的默认设置中觉醒
- 新建：来源(1) 工具(1) 概念(7) 人物(6) 著作(1)
- 更新：万维钢、现代思维工具100讲、index.md
- 备注：批量 ingest 第 1/15 篇。所有 8 张图片本地化成功。

## [2026-05-08] ingest | 主动高认知负荷：注意力的 Pro 模式
- 新建：来源(1) 工具(1) 概念(6) 人物(5) 著作(0)
- 更新：万维钢、现代思维工具100讲、index.md
- 备注：批量 ingest 第 2/15 篇。5 张图片本地化成功。

## [2026-05-08] ingest | 供给侧心态：怎样在正和的世界合作（以及竞争）
- 新建：来源(1) 工具(1) 概念(5) 人物(3) 著作(0)
- 更新：万维钢、现代思维工具100讲、index.md
- 备注：批量 ingest 第 3/15 篇。3 张图片本地化成功。

## [2026-05-08] ingest | 内核：你的三个「自我」
- 新建：来源(1) 工具(0) 概念(4) 人物(1) 著作(1)
- 更新：万维钢、现代思维工具100讲、丹尼尔·丹尼特、卡尔·弗里斯顿、自由能原理、预测处理、叙事重心、index.md
- 备注：批量 ingest 第 4/15 篇。4 张图片本地化成功。基本世界观第六条。

## [2026-05-08] ingest | 可能：不确定性是意义的燃料
- 新建：来源(1) 工具(0) 概念(10) 人物(5) 著作(3)
- 更新：万维钢、现代思维工具100讲、斯蒂芬·沃尔夫勒姆、index.md
- 备注：批量 ingest 第 5/15 篇。4 张图片本地化成功。基本世界观第五条。

## [2026-05-08] ingest | 复利：可积累的优势
- 新建：来源(1) 工具(0) 概念(10) 人物(7) 著作(1)
- 更新：万维钢、现代思维工具100讲、index.md
- 备注：批量 ingest 第 6/15 篇。4 张图片本地化成功。

## [2026-05-08] ingest | 社交资本、结构洞和搬家：容易向上流动的位置
- 新建：来源(1) 工具(2) 概念(4) 人物(3) 著作(0)
- 更新：万维钢、现代思维工具100讲、马克·格兰诺维特、社会资本、弱联系、index.md
- 备注：批量 ingest 第 7/15 篇。4 张图片本地化成功。

## [2026-05-08] ingest | 约束：先尊重，再行动
- 新建：来源(1) 工具(0) 概念(5) 人物(1) 著作(1)
- 更新：万维钢、现代思维工具100讲、埃隆·马斯克、index.md
- 备注：批量 ingest 第 8/15 篇。5 张图片本地化成功。基本世界观第四条。

## [2026-05-08] ingest | 能动：稳态生存的观念陷阱
- 新建：来源(1) 工具(0) 概念(6) 人物(2) 著作(1)
- 更新：万维钢、现代思维工具100讲、index.md
- 备注：批量 ingest 第 9/15 篇。5 张图片本地化成功。基本世界观第三条。

## [2026-05-08] ingest | 能耐寻求定理：君子不器
- 新建：来源(1) 工具(1) 概念(5) 人物(4) 著作(0)
- 更新：万维钢、现代思维工具100讲、埃隆·马斯克、森德希尔·穆来纳森、index.md
- 备注：批量 ingest 第 10/15 篇。4 张图片本地化成功。

## [2026-05-08] ingest | 自我决定理论：一流人物不可能是痛苦的卷王
- 新建：来源(1) 工具(0) 概念(8) 人物(4) 著作(1)
- 更新：万维钢、现代思维工具100讲、能动性、index.md
- 备注：批量 ingest 第 11/15 篇。3 张图片本地化成功。

## [2026-05-08] ingest | 自由能原理：活着就是对齐
- 新建：来源(1) 工具(0) 概念(4) 人物(1) 著作(0)
- 更新：万维钢、现代思维工具100讲、卡尔·弗里斯顿、自由能原理、预测处理、index.md
- 备注：批量 ingest 第 12/15 篇。4 张图片本地化成功。

## [2026-05-08] ingest | 认知解耦：三步调节负面情绪
- 新建：来源(1) 工具(1) 概念(7) 人物(2) 著作(0)
- 更新：万维钢、现代思维工具100讲、斯蒂芬·柯维、自由能原理、index.md
- 备注：批量 ingest 第 13/15 篇。4 张图片本地化成功。

## [2026-05-08] ingest | 身份认同：元认知黑魔法
- 新建：来源(1) 工具(1) 概念(6) 人物(3) 著作(1)
- 更新：万维钢、现代思维工具100讲、丹尼尔·丹尼特、詹姆斯·克利尔、掌控习惯、index.md
- 备注：批量 ingest 第 14/15 篇。5 张图片本地化成功。

## [2026-05-08] ingest | 重尾：世界服从极端值
- 新建：来源(1) 工具(0) 概念(9) 人物(3) 著作(0)
- 更新：万维钢、现代思维工具100讲、纳西姆·塔勒布、黑天鹅、反脆弱、index.md
- 备注：批量 ingest 第 15/15 篇（最后一篇）。6 张图片本地化成功。基本世界观第二条。批量 ingest 全部完成。

## [2026-05-08] schema-update | 身份认同 去重 + 根目录 Obsidian stub 清理
- 删除 `概念/身份认同.md`（与 `工具/身份认同.md` 同名同实体，违反 CLAUDE.md §4「one entity = one page」）
- 把概念页的「详细解释」+ 相关概念合并入 `工具/身份认同.md`（新增 `## 详细解释` 段、`## 相关概念` 段：[[主体-客体转化]] [[元认知]] [[界面自我]] [[文化是拒绝的结构]]）
- 删除根目录空文件 `身份认同.md`（Obsidian 自动生成的悬空 stub，未跟踪）
- index.md 已经只在 `## 工具` 下登记，无需修改
- 备注：批量 ingest 期间 agent 把同一实体写成了 concept + tool 两份。保留 tool，因本课「元认知黑魔法」的核心是把身份当作可主动操控的工具；归属感/连贯感等「被动面」并入 tool 页的「详细解释」。同类去重在 §7 lint 流程里有兜底。
