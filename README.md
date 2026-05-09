# DeDao 100 Modern Thinking Tools — Personal Wiki

万维钢《现代思维工具课》100 讲的 LLM 协同维护知识库。原文片段沉淀在 `raw/`，结构化的中文 wiki 由 LLM 增量构建在 `工具/`、`概念/`、`人物/`、`著作/`、`来源/` 五个目录中，全部以 Obsidian `[[wikilinks]]` 互联。

详细规范见 [`CLAUDE.md`](./CLAUDE.md)；本文件只覆盖**人类怎么用**。

---

## 目录布局

| 路径 | 写入方 | 内容 |
|---|---|---|
| `raw/` | **只有用户** | 从得到 App 剪藏的原文。LLM 只读，永不改写。 |
| `来源/` | LLM | 每篇课程一页：一句话总结、核心论点、关键概念、`[[wikilinks]]`，以及 **`## 原文`（得到 App 原文正文，自包含，便于静态 HTML 发布）** |
| `工具/` `概念/` `人物/` `著作/` | LLM | 实体页。一个实体一页，跨语言名进 `aliases:` |
| `index.md` | LLM | 全 wiki 目录 |
| `log.md` | LLM | append-only 操作日志 |
| `assets/` | LLM | ingest 时 `curl` 下载的课程图片，按 `assets/<lesson-title>/NN.<ext>` 归档；静态 HTML 发布的图片源 |
| `raw/assets/` | 用户（Obsidian 热键） | 用户阅读用的本地副本；LLM **不**在此处写入 |
| `_meta/` | 用户 + LLM | 设计文档、计划 |
| `.claude/` | LLM (skills) | Claude Code 配置：见下 |
| `.ingested.tsv` | LLM (`/dedao-ingest`) | 已 ingest 的 raw 文件清单（append-only）。放在根目录而非 `.claude/` 下，避免触发更严格的权限检查。 |

`raw/assets/` 是 Obsidian「Download attachments for current file」的落点；LLM 不会自动触发。

## 日常操作

### 1. 加新原文

把从得到 App 剪藏的 markdown 丢进 `raw/`。文件名建议保留原标题，例如 `叙事：这个宇宙的第一性原理 - 得到APP.md`，` - 得到APP` 后缀可有可无（见 `raw/能动：稳态生存的观念陷阱.md`）。

### 2. 让 LLM 处理：两个 skill

#### `/dedao-scan` — 扫描未处理的 raw 文件

不带参数：

```
/dedao-scan
```

LLM 会：
1. 跑 diff: `find raw -maxdepth 1 -name '*.md'` 与 `.ingested.tsv` 对比
2. 列出所有未处理的新文件
3. 问你要全部 ingest、挑选、还是调整顺序
4. 顺序调起 `/dedao-ingest`，**一篇一确认**

适用场景：一次性丢进去多个 raw 文件，让 LLM 帮你点清单。

#### `/dedao-ingest <path>` — 处理单个 raw 文件

```
/dedao-ingest raw/复利：可积累的优势 - 得到APP.md
```

LLM 会按 [`CLAUDE.md` §5](./CLAUDE.md) 的 10 步流程走完：读原文 → alias 去重 → **checkpoint** → 写来源页 → 建/更实体页 → 更新 `index.md` → 写 `log.md` → 追加 `.ingested.tsv` → 报告 → **不**自动 commit。

**Checkpoint（Step 3）是非常重要的暂停点**：LLM 抽完实体后会先把候选清单（"工具 X、概念 Y、人物 Z…哪些新建、哪些复用已有页面"）报给你，等你回话再写任何 wiki 页。这一步用于纠偏命名、合并别名、调整侧重。

不带参数也可以触发，LLM 会问你处理哪一篇。也可以用自然语言 "ingest 那篇复利" 触发同一个 skill。

### 3. 提问 / 复盘

直接在聊天里问，例如：

> 复利和能耐寻求定理之间有什么关系？

LLM 走 [`CLAUDE.md` §6](./CLAUDE.md) 的 query 流程：先读 `index.md` → 读相关页 → 综合作答（带 `[[wikilinks]]`）。如果综合内容 ≥200 字或连接 ≥2 个未文档化的概念，会主动问你要不要把答案沉淀回 `概念/<name>.md`。

### 4. 体检

```
lint
```

LLM 跑 [`CLAUDE.md` §7](./CLAUDE.md) 的 8 项检查（孤儿页、stub、缺页、`⚠️` 未决冲突、过时声明、断链、frontmatter 完整性、index 漂移），输出报告，**不**自动修。

---

## 给 LLM 的硬约束（节选自 [`CLAUDE.md`](./CLAUDE.md) §9）

- `raw/` 永远只读
- 冲突用 `> ⚠️ 与 [[…]] 中的说法不同：…` 标注，不静默覆盖
- 训练数据来源的事实必须打 `(*not from wiki*)`
- 一个实体只能有一页（先 alias 搜索再创建）
- ingest 不跳 Step 3 checkpoint
- 不主动 web 搜索

---

## 文件参考

| 想看什么 | 去哪 |
|---|---|
| LLM 工作规范全文 | [`CLAUDE.md`](./CLAUDE.md) |
| 全 wiki 目录 | [`index.md`](./index.md) |
| 每次操作历史 | [`log.md`](./log.md) |
| Skill 实现 | `.claude/skills/dedao-ingest/SKILL.md`、`.claude/skills/dedao-scan/SKILL.md` |
| 已处理状态 | `.ingested.tsv` |
| 设计文档 | `_meta/specs/`、`_meta/plans/` |
