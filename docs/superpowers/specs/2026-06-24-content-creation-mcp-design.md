# 设计：基于知识库的内容创作系统（MCP + Claude Desktop）

- 日期：2026-06-24
- 状态：已通过 brainstorming，待用户审阅
- 作者：LLM + 用户协作

## 1. 背景与目标

本仓库是《现代思维工具课》的 Obsidian 知识库（工具 58 / 概念 423 / 人物 260 /
著作 78 / 来源 70，约 889 个 wiki 页面，已发布到 Quartz）。用户希望**用知识库内容
创作面向预设观众和话题场景的内容**，工作方式是：

- 用一个本地 **MCP 服务**暴露「搜索本地数据 + 选题 + 存草稿」的能力；
- 在 **Claude Desktop** 里设置 task，**手动触发**一段 prompt，由 Claude 调用该 MCP
  跑完整个创作任务，产出**待审草稿**。

**用户最核心的需求**：一套能调用 MCP 跑完整个创作任务的 **prompt 模板**。

## 2. 范围与非目标

### 范围
- 子项目 A：本地 Python MCP 服务 `dedao-vault-mcp`（读 wiki、选题、存草稿）。
- 子项目 B：内容生成层 = 栏目配置 + 语言/文风档 + 主 prompt 模板 + 栏目实例 prompt。

### 非目标（明确不做）
- **不做定时/自动触发**：用户自己在 Claude Desktop 设 task 并手动触发。
- **不做自动发布**：只产出待审草稿，永不直接发到任何平台。
- **MCP 不联网**：联网取热点由 Claude Desktop 自带 web search 负责，不进 MCP。
- **不做语义/向量检索**（首版）：约 889 个文件，结构化 + 关键词检索已足够；
  预留 `semantic_search` 扩展位，未来热点呼应不够准时再加。
- **不碰 `raw/`**；不写 wiki 五个文件夹。

## 3. 架构总览

两个子项目，B 依赖 A。**先建完并测好 A，再接 B。**

```
┌─────────────────────── Claude Desktop (用户手动触发 task) ───────────────────────┐
│                                                                                   │
│   主 prompt 模板 (English)  ──读栏目配置──►  按 format+language 成稿  ──存草稿──►   │
│        │                                                                  │        │
│        │ 调用工具                                              联网(仅 hotspot) │   │
│        ▼                                                                  ▼        │
│   ┌──────────────────── dedao-vault-mcp (本地 Python, stdio) ────────────────┐    │
│   │  只读: 工具/ 概念/ 人物/ 著作/ 来源/      读+写: 创作/                    │    │
│   │  检索 · 选题 · 草稿        启动扫描 ~889 md 建内存索引(秒级)              │    │
│   └──────────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────────┘
                              raw/  ← 全程零接触
```

## 4. 组件 A：`dedao-vault-mcp`

### 4.1 职责边界（强约束）
- **只读**：`工具/ 概念/ 人物/ 著作/ 来源/`（wiki 五个文件夹）——永不写入。
- **读 + 写**：`创作/`（草稿 + 栏目配置）——所有写入路径必须规范化后落在
  `创作/` 内，越界（`..`、绝对路径、符号链接逃逸）一律拒绝。
- **完全不碰** `raw/`。

### 4.2 索引模型
启动时（及 `refresh_index` 时）扫描 wiki 五个文件夹的全部 `*.md`，每页解析：
- **frontmatter**（YAML）：`type / aliases / created / updated / verified / sources / tags`；
- **正文分节**：按 `## ` 标题切成 section dict（如 `一句话定义`、`简介`、`详细解释`、
  `出现在` 等），保留原文；
- **出链**：正则提取 `[[...]]`，剥离 `|alias` 与 `#heading`，得到目标正名候选。

构建三张内存表：
1. `pages: name -> Page`，`Page = {name, path, type, aliases[], tags[], frontmatter{}, sections{}, body, outlinks[]}`；
2. `alias_index: lowercased alias/name -> canonical name`（用于解析与模糊匹配）；
3. `backlinks: name -> set(name)`（由所有页面 outlinks 反向聚合，经 alias 解析）。

约 889 个文件，秒级完成。frontmatter 解析失败的页 **跳过 + 结构化告警**，不崩溃。
索引只在启动/`refresh_index` 时构建（Claude Desktop 每个 session 起一次进程，足够）。

### 4.3 工具清单（最终接口）

返回值统一为 JSON 可序列化结构。`name` 入参一律先过 `alias_index` 解析。

| 工具 | 签名 | 返回 |
|---|---|---|
| `search_pages` | `(query: str, type: str=None, tag: str=None, limit: int=20)` | `[{name, type, one_liner, score, path}]`，按命中位置排序：标题 > 别名 > 一句话定义/简介 > 正文 |
| `get_page` | `(name: str)` | `{name, type, aliases, tags, frontmatter, sections{标题:文本}, outlinks, path}`；未命中→`{error:"not_found", suggestions:[近似别名]}` |
| `get_backlinks` | `(name: str)` | `[{name, type, one_liner}]` |
| `get_related` | `(name: str)` | `[{name, type, one_liner, reason}]`，来源：`相关工具/相关概念` 小节 + 共同来源共现 |
| `pick_topics` | `(mode: str, type: str=None, tag: str=None, count: int=5, exclude_written: bool=True)` | `[{name, type, one_liner, why}]`；`mode∈{random, by_tag, recently_updated, least_linked, unused}` |
| `list_columns` | `()` | `[{id, name, format, language, topic_mode, ...}]`（读 `创作/_栏目.yaml`） |
| `get_column` | `(id: str)` | 单个栏目完整配置 dict；未命中→`{error, available:[ids]}` |
| `save_draft` | `(column: str, format: str, title: str, body: str, covers: list[str], language: str=None)` | `{path, status:"saved"}`；路径越界→`{error:"path_rejected"}` |
| `list_drafts` | `(column: str=None, limit: int=50)` | `[{path, column, title, covers, created, status}]` |
| `refresh_index` | `()` | `{pages_indexed, warnings:[...]}` |

选题模式语义：
- `random` — 随机抽 count 个（可叠加 type/tag 过滤）；
- `by_tag` — 命中 `tag` 的页面；
- `recently_updated` — 按 frontmatter `updated:` 倒序；
- `least_linked` — 反链最少（≈"还没被充分串联/展开过的"）；
- `unused` — 排除 `创作/` 中已被 `covers` 引用过的实体（即 `exclude_written` 的独立入口）。

`exclude_written=True` 时，所有 mode 都会先读 `list_drafts` 的 `covers` 集合做去重。

### 4.4 错误处理
- frontmatter 损坏 → 跳过该页 + 计入 `refresh_index` 的 `warnings`；
- `get_page` 未命中 → 返回 `not_found` + alias 模糊建议（不抛异常）；
- `save_draft` 路径穿越/越界 → 拒绝并返回 `path_rejected`；
- 空文件夹/空结果 → 返回空列表，非报错；
- `_栏目.yaml` 缺失或 YAML 错误 → `list_columns`/`get_column` 返回结构化错误，不崩。

### 4.5 仓库布局
```
_mcp/dedao-vault-mcp/
  dedao_vault_mcp/
    __init__.py
    server.py        # MCP stdio 入口，注册工具
    index.py         # 扫描 + 三张表
    pages.py         # 单页解析：frontmatter / 分节 / 出链
    topics.py        # pick_topics 各模式
    drafts.py        # save_draft / list_drafts（路径强校验）
    columns.py       # 读 创作/_栏目.yaml
  tests/             # pytest + 微型假 vault fixture
  pyproject.toml
  README.md          # 安装 + Claude Desktop 接线说明
```
（`_mcp/` 前缀下划线，不进 Obsidian 主视图；Quartz 同步列表不含它，天然不发布。）

### 4.6 测试策略（TDD）
fixture：一个含 6-8 个 md 的微型假 vault（覆盖各 type、含别名、含损坏 frontmatter）。
用例：索引构建数目、别名解析、`search_pages` 排序、`get_related` 的两条来源、
`pick_topics` 全部 5 种 mode、`exclude_written` 去重、`save_draft` 路径越界拒绝、
损坏 frontmatter 不崩。

## 5. 组件 B：生成层

### 5.1 栏目配置 `创作/_栏目.yaml`
```yaml
columns:
  - id: thinking-tools-uk
    name: Thinking Tools (UK)
    audience: UK-based lifelong learners on LinkedIn
    voice: clear, friendly, one practical takeaway each
    platform: LinkedIn
    format: social          # social | longform | script
    language: en-GB         # 默认 en-GB；可设 zh 覆盖
    topic_mode: rotation    # given | auto | hotspot | rotation
    topic_filter: { type: tool }
    length: under 150 words
    extras: end with one reflective question

  - id: daily-tool-zh
    name: 每日一个思维工具
    audience: 关注个人成长的职场年轻人
    voice: 口语、有梗、每条带一个可立刻用的动作
    platform: 小红书
    format: social
    language: zh            # 覆盖默认英文
    topic_mode: rotation
    topic_filter: { type: tool, tag: 板块/决策 }
    length: 300字以内
    extras: 带3个话题标签
```

### 5.2 语言与文风档（prompt 内置，按栏目 `language` 选用）
- **默认 `en-GB`（钉死在雅思 ~6.5 / CEFR B2）**：British 拼写（colour / organise /
  -ise / whilst）；句子中等长度、结构清晰；**避免生僻或文学化词汇、避免过长复杂
  从句**；允许偶有朴素表达——目标是"流利但不像母语炫技、不像 AI"，读起来像用户
  本人写的。源材料为中文，由 Claude 转写为英文；**人名/书名优先取页面 frontmatter
  的英文 `aliases`**（如 `[[卡尔·弗里斯顿]]` → "Karl Friston"）。此档难度可调，先按 6.5 定。
- **`zh`**：跟随栏目 `voice` 字段，中文。

### 5.3 草稿输出 `创作/<栏目id>/YYYY-MM-DD-<slug>.md`
```yaml
---
type: draft
column: thinking-tools-uk
format: social
language: en-GB
covers: ["[[认知解耦]]", "[[叙事]]"]   # 用到的实体，供 pick_topics 去重
status: pending-review
created: 2026-06-24
---
（正文 body）

---
## 用到的知识库页面
- [[认知解耦]]
- [[叙事]]
```
`covers` 是 `pick_topics(exclude_written)` 去重的依据。`创作/` 不在 Quartz 同步列表，私密。

### 5.4 主 prompt 模板（规范，English，默认产出 en-GB）

这是头号交付物。用户触发时只需改 `column: <id>`，并可选附 `Topic:` / `Hotspot:`。

```
You are the content-creation assistant for the column "<COLUMN_NAME>".
Goal: produce ONE review-ready draft for this column and save it. Do not publish.

Available tools — dedao-vault-mcp:
  get_column, search_pages, get_page, get_related, get_backlinks,
  pick_topics, list_drafts, save_draft, refresh_index.

Steps:
1. Call get_column("<COLUMN_ID>") to load config
   (audience / voice / platform / format / language / topic_mode / topic_filter
   / length / extras). The vault is in Chinese; the OUTPUT language is the
   column's `language` (default en-GB).
2. Decide the topic:
   - If I supplied "Topic: X" in this message, use X.
   - Else follow topic_mode:
       rotation / auto  -> pick_topics(mode, type, tag, exclude_written=true),
                           choose the single best candidate.
       hotspot          -> first use your own web search to understand the
                           "Hotspot:" I gave, then search_pages(...) to find the
                           tools/concepts in the vault that resonate with it.
   - Call list_drafts("<COLUMN_ID>") to avoid repeating a recent topic.
3. Gather material: get_page on the chosen topic, then get_related /
   get_backlinks to find 2-3 connectable tools/concepts; search_pages to fill
   gaps. Use ONLY what the vault contains. For facts not in the vault: either
   omit, or flag them explicitly — never invent.
4. Write the draft per the format template + language profile below.
5. save_draft(column="<COLUMN_ID>", format=<format>, title=..., body=...,
   covers=[every wiki page you used], language=<language>).
6. Report: title, saved path, pages used, and one sentence on why this topic.

[FORMAT TEMPLATES]
- social   : hook opening + 2-4 key points + ONE immediately usable action +
             close; respect `length`; add tags per `extras`.
- longform : title + lead-in + argument (weave 2-3 concepts) + example +
             takeaway; sub-headings allowed.
- script   : spoken, rhythmic; segmented [HOOK] / [BODY] / [CALL-TO-ACTION];
             suitable for recording aloud.

[LANGUAGE PROFILE]
- en-GB (DEFAULT): British spelling; IELTS ~6.5 / CEFR B2 difficulty;
  medium-length, clear sentences; avoid rare/literary vocabulary and very long
  complex clauses; plain phrasing is fine — it should read as if I wrote it.
  Take people/book names from each page's English `aliases`.
- zh: follow the column `voice`, in Chinese.

[CONSTRAINTS]
Use only knowledge-base content (web search ONLY in hotspot mode, and only to
understand the hotspot itself). Do not publish — only save the draft.
```

### 5.5 栏目实例 prompt（交付时每栏目一份填好的）
spec 实现阶段为 `创作/_栏目.yaml` 里每个栏目生成一份占位已替换的实例 prompt
（如 `thinking-tools-uk`、`daily-tool-zh` 各一份），存为
`创作/_prompts/<栏目id>.md`，用户直接复制进 Claude Desktop task。

## 6. 运行流程（手动触发）
1. 安装 `dedao-vault-mcp`，加入 Claude Desktop 的 `claude_desktop_config.json`。
2. 在 Claude Desktop 新建 task，粘贴对应栏目的实例 prompt。
3. 需要时手动触发；hotspot 模式下在消息里补 `Hotspot: …`，指定主题时补 `Topic: …`。
4. Claude 调 MCP 跑完流程，草稿落到 `创作/<栏目id>/`。
5. 用户在 Obsidian 审阅、修改、发布。

## 7. 决策记录与假设
- **D1** 不联网进 MCP；联网交 Claude Desktop。理由：职责清晰，MCP 保持纯本地只读地基。
- **D2** 首版不做语义检索（YAGNI），预留扩展位。
- **D3** MCP 自包含写草稿（写入死锁 `创作/`），不另装 filesystem MCP。理由：单服务、写入面最小、安全。
- **D4** 单一参数化主 prompt（按栏目配置自适应），不做格式×选题×语言的组合爆炸。
- **D5** 输出默认 en-GB（雅思 6.5），栏目可设 `zh` 覆盖；交付的 prompt 模板用英文写。
- **D6** 定时/触发不在范围内，由用户在 Claude Desktop 手动设 task 触发。
- **语言**：MCP 语言 = Python（`mcp` SDK，文本处理顺手，无 JS 依赖）。

## 8. 里程碑
1. **M1 — MCP 地基**：索引 + 检索三件套（`search_pages`/`get_page`/`get_backlinks`/`get_related`）+ 测试。
2. **M2 — 选题与草稿**：`pick_topics`（5 模式 + 去重）+ `save_draft`/`list_drafts`（路径强校验）+ `columns` + 测试。
3. **M3 — 接线与 prompt**：`README` 接线说明 + `创作/_栏目.yaml` 初始栏目 + 主 prompt 模板 + 每栏目实例 prompt。
4. **M4 — 端到端试跑**：在 Claude Desktop 手动触发，产出 1 篇 en-GB social 草稿，按观感微调文风档。
