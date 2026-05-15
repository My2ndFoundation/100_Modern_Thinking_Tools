# DeDao 溯源验证 + 内容充实 — 设计 spec

- 日期：2026-05-15
- 状态：已批准（用户确认设计）
- 作者：Claude（与用户协作）

## 1. 目标

对 DeDao-100 wiki 中 `工具/`(43)、`概念/`(294)、`人物/`(146) 共 ~483 页做一次联网溯源验证，
并按「中等力度」充实内容。完成后把这一能力沉淀为独立 skill `/dedao-verify`，
未来可按需对增量页面复跑。

非目标：不处理 `著作/`、`来源/`；不做全页重写；不动 `raw/`。

## 2. 可信信源定义

按可信度优先：

1. 维基百科（优先英文版，辅以中文版做译名/中文语境核对）
2. 机构 / 政府 / 大学官网（含作者本人主页、官方传记）
3. 同行评议科学期刊、Google Scholar、出版社官方页
4. 可信新闻机构（路透、BBC、NYT、卫报等）

每条新增/核验断言至少 1 个独立可信源；关键事实尽量 2 个交叉。
禁止用个人博客、内容农场、AI 生成站、未署名 wiki 镜像作为唯一信源。

## 3. 单页处理 SOP（sub-agent 执行）

1. 读目标页面。抽取**可核验断言**：
   - 通用：一句话定义、归属（提出者/年代/出处）、年份、关键事实、公式。
   - 人物页另核：生卒年、国籍、头衔、主要贡献、代表作。
2. 对每条断言用可信信源检索核对（WebSearch + WebFetch）。
3. 比对分流：
   - **明显笔误**（拼写、年份、人名/译名、机构名）→ 直接订正；订正处行内加
     HTML 注释：`<!-- 溯源订正 2026-05-15: 原作「X」，据 <source-url> 改为「Y」 -->`
     （注释不渲染，正文干净）。
   - **事实 / 解释分歧**（非笔误，涉及实质或观点）→ **不覆盖**，在相关段落下加：
     `> ⚠️ 与权威信源不同：<差异说明>（[信源](url)）`，原文保留。
4. **补全薄弱段**：当 `详细解释` / `操作步骤` / `主要贡献` / `简介` 等本应有实质内容的
   标准段为空或仅一行时，补 1–2 段，每段末尾标 `（[来源](url)）`。已有充实内容的段落不动，
   不为充实而充实（YAGNI）。
5. 页尾新增/合并 `## 外部参考` 段，列 2–4 条：
   `- [标题](url) — <信源类型，如 维基百科/期刊/官网>`
6. frontmatter：`updated:` 改为 2026-05-15；新增 `verified: 2026-05-15`。
   `aliases:` 若发现权威英文名缺失则补。
7. 把页面相对路径追加到 `.verified.tsv`（见 §5）。
8. 向 orchestrator 返回结构化报告：
   `{page, status(verified|skipped|error), 订正条目[], ⚠️条目[], 新增引用数, 补段数}`

### 约束（子 agent 红线）

- 只 Edit 自己批次内的实体页。**不碰** `index.md` / `log.md` / `CLAUDE.md` / `raw/` / 其他批次的页。
- 不删除原有正文与既有 `[[wikilinks]]`。
- 不把 web 事实写成「来自 wiki」；新增内容一律就地标 `（[来源](url)）`。
- 已有 `verified: 2026-05-15` 的页直接 skip（幂等）。

## 4. Schema 演进（收尾时以提案形式更新 CLAUDE.md，不静默改）

| 变更 | 位置 |
|---|---|
| frontmatter 新增 `verified: YYYY-MM-DD` | §3 页面规范 |
| 新增标准段 `## 外部参考`（工具/概念/人物模板末尾） | §3 |
| 新状态文件 `.verified.tsv`（append-only，仿 `.ingested.tsv`） | §5/§8 |
| `log.md` 新事件类型 `verify` | §8 |
| ingest Step 9 增一句「建议事后跑 `/dedao-verify`」 | §5 工作流 |
| §6 碰撞处理：声明 `/dedao-verify` 是被授权的联网模式，非静默 web fallback | §6/§9 |

`.verified.tsv` 格式（含头部注释，仿 `.ingested.tsv`）：
```
# DeDao-100 verify state — append-only, written by /dedao-verify.
# Format: <wiki_page_path>\t<YYYY-MM-DD>\t<status>
<TAB-separated rows>
```

## 5. 并行执行架构

- **批次划分**：按类型分组，每 sub-agent 约 25–30 页，约 17 个 agent。
- **波次**：每波最多 5 个并发 agent；orchestrator 等一波收齐再发下一波。
- **试点门控**（强制）：
  1. 先只跑 **1 个 agent / 12 个工具页**。
  2. orchestrator 汇总样张（含订正、⚠️、外部参考、补段示例）给用户。
  3. 用户确认格式与质量 → 才放全量；不通过 → 调 SOP 后重跑试点，不浪费 ~470 页 web 调用。
- **可恢复**：`.verified.tsv` + frontmatter `verified:` 双重标记；中断续跑时已验证页自动 skip。
- **聚合**：orchestrator 收齐全部报告后：
  - 写 `溯源验证报告.md`（项目根）：总订正表 + 全部 ⚠️ 清单 + 统计。
  - `log.md` 追加一条 `## [2026-05-15] verify | 全量溯源验证（工具+概念+人物）`。
  - 不逐页写 log；报告即审计入口。
- 不自动 commit；留 dirty tree 供用户 review。

## 6. /dedao-verify skill（终态产物）

独立 skill `.claude/skills/dedao-verify/SKILL.md`：

- 无参 `/dedao-verify`：用 `LC_ALL=C comm` diff（wiki 工具/概念/人物 文件 vs `.verified.tsv`），
  对未验证页按 §3 SOP 批量跑（沿用 §5 波次+试点门控逻辑，规模小则可跳过试点）。
- 带参 `/dedao-verify 工具/凯利公式.md`：单页跑 SOP。
- 复用 §3 SOP、§4 schema、§5 聚合规则；引用 CLAUDE.md 而非复制规则。
- ingest skill 仅在 Step 9 增一句提示，ingest 流程本身不变、不变慢。

## 7. 交付顺序

1. 本 spec（已写、待用户 review）
2. writing-plans → 实施计划
3. 执行：试点 12 页 → 用户确认 → 全量并行 → 聚合报告
4. 建 `/dedao-verify` skill
5. CLAUDE.md schema 提案（§4 表）

## 8. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 483 页 × 多次 web 调用，耗时/耗 token | 试点门控；波次并发；medium 力度不重写 |
| web 信源不可信导致引入错误 | §2 白名单；关键事实双源交叉 |
| 并行写冲突 | 子 agent 只改自己批次页；聚合写由 orchestrator 独占 |
| 误把观点分歧当笔误覆盖 | 仅拼写/年份/译名算笔误；其余一律 ⚠️ 不覆盖 |
| 中断 | `.verified.tsv` + frontmatter 幂等续跑 |
