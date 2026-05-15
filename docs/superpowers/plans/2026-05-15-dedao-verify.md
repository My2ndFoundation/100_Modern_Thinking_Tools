# DeDao 溯源验证 + 内容充实 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 ~483 页（工具/概念/人物）做联网溯源验证+中等力度充实，并沉淀为 `/dedao-verify` skill。

**Architecture:** orchestrator（本会话）持有共享写（状态文件/报告/log/CLAUDE.md）；多个无状态 sub-agent 并行执行单页 SOP，只改各自批次的实体页。试点门控在全量前强制人工确认。

**Tech Stack:** Claude Code Agent 工具（并行 sub-agent）、WebSearch/WebFetch、bash/`LC_ALL=C comm`、Markdown wiki。

参考 spec：`docs/superpowers/specs/2026-05-15-dedao-verify-design.md`（SOP=§3，schema=§4，并行=§5）。

---

## File Structure

- `.verified.tsv`（新建，项目根）— append-only 验证状态，供增量 diff。
- `溯源验证报告.md`（新建，项目根）— 聚合审计：订正表 + ⚠️ 清单 + 统计。
- `工具/*.md`、`概念/*.md`、`人物/*.md`（修改）— sub-agent 按 SOP 就地编辑。
- `log.md`（修改，orchestrator 独占）— 追加一条 `verify` 事件。
- `.claude/skills/dedao-verify/SKILL.md`（新建）— 终态 skill。
- `CLAUDE.md`（修改，提案）— §3/§5/§6/§8/§9 schema 演进。
- `docs/agent-prompts/dedao-verify-page.md`（新建）— 单页 SOP 的 sub-agent prompt 模板（DRY：试点/全量/skill 共用）。

---

## Task 1: 状态文件脚手架

**Files:**
- Create: `.verified.tsv`
- Test: 手工命令校验 diff 逻辑

- [ ] **Step 1: 创建 `.verified.tsv` 头部**

写入（仿 `.ingested.tsv` 格式）：
```
# DeDao-100 verify state — append-only, written by /dedao-verify.
# Format: <wiki_page_path>\t<YYYY-MM-DD>\t<status>
# To diff unverified: LC_ALL=C comm -23 <(find 工具 概念 人物 -maxdepth 1 -type f -name '*.md' | LC_ALL=C sort) <(grep -v '^#' .verified.tsv | cut -f1 | LC_ALL=C sort)
```

- [ ] **Step 2: 验证 diff 命令返回全部 483 页（尚无验证记录）**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools" && LC_ALL=C comm -23 <(find 工具 概念 人物 -maxdepth 1 -type f -name '*.md' | LC_ALL=C sort) <(grep -v '^#' .verified.tsv | cut -f1 | LC_ALL=C sort) | wc -l
```
Expected: `483`

- [ ] **Step 3: Commit**
```bash
git add .verified.tsv && git commit -m "chore: add .verified.tsv verify-state scaffold"
```

---

## Task 2: 单页 SOP sub-agent prompt 模板（DRY 源）

**Files:**
- Create: `docs/agent-prompts/dedao-verify-page.md`

- [ ] **Step 1: 写 prompt 模板**

内容必须是可直接交给 sub-agent 的完整 prompt（占位符仅 `{{PAGE_LIST}}`、`{{TYPE}}`）：

```markdown
你是 DeDao-100 wiki 的溯源验证 sub-agent。项目根：
/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools

只处理这些页面（{{TYPE}} 类型），逐页执行，不碰其他文件：
{{PAGE_LIST}}

== 可信信源（按优先级） ==
1. 维基百科（优先 en，辅以 zh 做译名/中文语境）
2. 机构/政府/大学官网、作者主页、官方传记
3. 同行评议期刊、Google Scholar、出版社官方页
4. 可信新闻（路透/BBC/NYT/卫报等）
禁用：个人博客、内容农场、AI 生成站、未署名 wiki 镜像作为唯一信源。
每条关键事实尽量 2 个独立可信源交叉。

== 每页 SOP ==
1. Read 页面。抽取可核验断言：一句话定义、归属（提出者/年代/出处）、年份、
   关键事实、公式；人物页另核生卒年/国籍/头衔/主要贡献/代表作。
2. 对每条断言用 WebSearch + WebFetch 在可信信源核对。
3. 分流：
   - 明显笔误（拼写/年份/人名译名/机构名）→ 直接 Edit 订正，订正处行内加：
     <!-- 溯源订正 2026-05-15: 原作「X」，据 <source-url> 改为「Y」 -->
   - 事实/解释分歧（非笔误）→ 不覆盖，在相关段落下方加一行：
     > ⚠️ 与权威信源不同：<差异说明>（[信源](url)）
4. 补全薄弱段：详细解释/操作步骤/主要贡献/简介 等本应有实质内容的标准段
   为空或仅一行时，补 1–2 段，每段末尾标 （[来源](url)）。已充实的不动。
5. 页尾新增或合并 ## 外部参考 段，列 2–4 条：
   - [标题](url) — <信源类型>
6. frontmatter：updated: 改 2026-05-15；新增 verified: 2026-05-15；
   缺权威英文名时补 aliases:。
7. 不删原有正文与 [[wikilinks]]；不把 web 事实写成来自 wiki；
   已含 verified: 2026-05-15 的页直接 skip。

== 红线 ==
只 Edit 上面列出的页面。绝不碰 index.md / log.md / CLAUDE.md / raw/ /
.verified.tsv / 其他页。不 git commit。

== 返回 ==
最后用以下结构汇报每页（供 orchestrator 聚合）：
PAGE: <相对路径>
STATUS: verified | skipped | error
订正: <每条一行：字段｜原→新｜信源url>，无则「无」
⚠️: <每条一行：差异说明｜信源url>，无则「无」
补段: <段名列表>，无则「无」
外部参考: <新增条数>
```

- [ ] **Step 2: Commit**
```bash
git add docs/agent-prompts/dedao-verify-page.md && git commit -m "chore: add dedao-verify single-page SOP agent prompt"
```

---

## Task 3: 试点（强制门控）— 12 个工具页

**Files:**
- Modify: 12 个 `工具/*.md`
- Modify: `.verified.tsv`（orchestrator 追加）

- [ ] **Step 1: 选定试点 12 页**

取 `工具/` 下覆盖不同板块的 12 页（含已成熟页 + stub）：
凯利公式、反脆弱无关——固定清单：
`工具/凯利公式.md 工具/费米化.md 工具/杠铃策略.md 工具/OODA 环.md 工具/WOOP.md 工具/费曼学习法.md 工具/事前验尸.md 工具/红队.md 工具/贝叶斯主义.md 工具/参考类预测.md 工具/刻意练习.md 工具/期权.md`

- [ ] **Step 2: 派 1 个 sub-agent 跑试点**

用 Agent 工具（general-purpose，model sonnet），prompt = `docs/agent-prompts/dedao-verify-page.md` 内容，
`{{TYPE}}`=工具，`{{PAGE_LIST}}`=Step 1 的 12 个路径（每行一个）。

- [ ] **Step 3: orchestrator 把 12 页追加进 `.verified.tsv`**

对 agent 返回 STATUS=verified 的页，逐行 append：
`<page>\t2026-05-15\tverified`（用 Edit/Write 追加，不重排）。

- [ ] **Step 4: 汇总样张给用户 → 等待确认（HARD GATE）**

在 chat 给出：3 个代表页的 diff 摘要 + 全部订正条目 + 全部 ⚠️ + 外部参考示例 + 统计。
明确问：「格式/质量是否 OK？OK 则放全量；否则我调 SOP 重跑试点。」
**未得到用户确认，不进入 Task 4。** 若用户要求改 → 改 `docs/agent-prompts/dedao-verify-page.md`，
回滚这 12 页（`git checkout -- <pages>`）+ 从 `.verified.tsv` 移除对应行，重跑 Step 2。

- [ ] **Step 5: Commit 试点结果**
```bash
git add 工具/ .verified.tsv && git commit -m "feat(verify): 试点 12 个工具页溯源验证"
```

---

## Task 4: 全量并行验证（剩余 ~471 页）

**Files:**
- Modify: 剩余 `工具/` + 全部 `概念/` + 全部 `人物/`
- Modify: `.verified.tsv`

- [ ] **Step 1: 生成未验证页清单并分批**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools" && LC_ALL=C comm -23 <(find 工具 概念 人物 -maxdepth 1 -type f -name '*.md' | LC_ALL=C sort) <(grep -v '^#' .verified.tsv | cut -f1 | LC_ALL=C sort) > /tmp/dedao_unverified.txt && wc -l /tmp/dedao_unverified.txt && awk -F/ '{print $1}' /tmp/dedao_unverified.txt | sort | uniq -c
```
Expected: ~471 行，按 工具/概念/人物 分布。

- [ ] **Step 2: 切成 ~17 批**

按类型不混批，每批 ≤30 页：
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools" && rm -rf /tmp/dedao_batches && mkdir -p /tmp/dedao_batches && for t in 工具 概念 人物; do grep "^$t/" /tmp/dedao_unverified.txt | split -l 30 -d - "/tmp/dedao_batches/${t}_"; done && ls -1 /tmp/dedao_batches | wc -l && ls /tmp/dedao_batches
```
Expected: ~17 个批文件。

- [ ] **Step 3: 分波并行派 sub-agent（每波 ≤5）**

对每个批文件派 1 个 Agent（general-purpose，model sonnet），prompt = Task 2 模板，
`{{TYPE}}` = 批文件名前缀，`{{PAGE_LIST}}` = 批文件每行路径。
**单条消息内最多发 5 个 Agent 调用**；一波全部返回后再发下一波，直至所有批完成。
收到每个 agent 报告后立即缓存其结构化结果（供 Task 5 聚合）。

- [ ] **Step 4: 每波后把已验证页追加进 `.verified.tsv`**

对该波所有 STATUS=verified 页 append 行；STATUS=error 的页记下，留待 Step 6。

- [ ] **Step 5: 全部波次完成后核对覆盖率**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools" && LC_ALL=C comm -23 <(find 工具 概念 人物 -maxdepth 1 -type f -name '*.md' | LC_ALL=C sort) <(grep -v '^#' .verified.tsv | cut -f1 | LC_ALL=C sort) | wc -l
```
Expected: `0`（全部已验证）。非 0 → 列出残余页。

- [ ] **Step 6: 残余/error 页补跑**

对 Step 5 残余 + Step 4 记录的 error 页，单独再派 1 个 sub-agent 补跑，重复至覆盖率 0
（最多 3 轮；仍失败的页在 Task 5 报告里单列「未能验证」）。

- [ ] **Step 7: Commit 全量结果**
```bash
git add 工具/ 概念/ 人物/ .verified.tsv && git commit -m "feat(verify): 全量溯源验证 工具+概念+人物 (~483 页)"
```

---

## Task 5: 聚合报告 + log

**Files:**
- Create: `溯源验证报告.md`
- Modify: `log.md`

- [ ] **Step 1: 写 `溯源验证报告.md`**

结构：
```markdown
# 溯源验证报告 — 2026-05-15

## 统计
- 验证页数：N（工具 a / 概念 b / 人物 c）
- 笔误订正：X 处
- ⚠️ 事实分歧：Y 处
- 补全薄弱段：Z 段
- 未能验证：W 页（列出）

## 笔误订正清单
| 页面 | 字段 | 原 → 新 | 信源 |

## ⚠️ 事实分歧清单
| 页面 | 差异说明 | 信源 |

## 未能验证
- <page> — <原因>
```
用所有 sub-agent 缓存报告填充。

- [ ] **Step 2: 追加 `log.md` 一条 verify 事件**

追加（不动既有行）：
```
## [2026-05-15] verify | 全量溯源验证（工具+概念+人物）
- 验证：工具(a) 概念(b) 人物(c)
- 订正：X 处笔误；⚠️ Y 处事实分歧；补 Z 段
- 报告：[[溯源验证报告]]
- 备注：未能验证 W 页（见报告）
```

- [ ] **Step 3: Commit**
```bash
git add 溯源验证报告.md log.md && git commit -m "docs(verify): 聚合溯源验证报告 + log"
```

---

## Task 6: 创建 /dedao-verify skill

**Files:**
- Create: `.claude/skills/dedao-verify/SKILL.md`

- [ ] **Step 1: 调用 skill-creator skill 起草**

用 `Skill` 工具调 `skill-creator:skill-creator`，按其流程产出 `.claude/skills/dedao-verify/SKILL.md`，
要求覆盖：
- frontmatter：`name: dedao-verify`、description（触发词：「溯源」「verify」「核实」「dedao-verify」、或给定 工具/概念/人物 下路径）、`model: claude-opus-4-7`、`effort: high`。
- 无参：用 Task 1 Step 2 的 `LC_ALL=C comm` diff 找未验证页，按 spec §3 SOP 跑（规模大则套 spec §5 波次+试点门控；规模小可跳过试点）。
- 带参单页：`/dedao-verify 工具/凯利公式.md` → 单页 SOP。
- SOP 不复制，引用 `docs/agent-prompts/dedao-verify-page.md` 与 spec §3。
- 红线沿用：只改实体页、不碰 raw/、不静默覆盖（笔误界定同 spec §3）、不自动 commit。

- [ ] **Step 2: 校验 skill frontmatter 与触发**

Run:
```bash
cd "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools" && head -6 .claude/skills/dedao-verify/SKILL.md
```
Expected: 含 `name: dedao-verify` 与 description。

- [ ] **Step 3: Commit**
```bash
git add .claude/skills/dedao-verify/ && git commit -m "feat: add /dedao-verify skill"
```

---

## Task 7: CLAUDE.md schema 提案更新

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 向用户提案 §4 表中的 6 处变更（CLAUDE.md §10 要求提案而非静默改）**

在 chat 列出拟改条目（§3 frontmatter 加 `verified:`；§3 加 `## 外部参考` 模板段；
§5 ingest Step 9 加「建议事后跑 `/dedao-verify`」；§6 声明 `/dedao-verify` 为被授权联网模式；
§7 lint 增「未验证页」「`verified:` 早于最新信源」检查项；§8 log 事件类型加 `verify`；
§9 增「`.verified.tsv` append-only，不静默覆盖事实分歧」），等用户批准。

- [ ] **Step 2: 用户批准后 Edit CLAUDE.md 对应小节**

逐处 Edit（精确锚定既有文本），不重排无关内容。

- [ ] **Step 3: Commit**
```bash
git add CLAUDE.md && git commit -m "docs: CLAUDE.md schema 演进 — 溯源验证 (verified/外部参考/.verified.tsv/verify 事件)"
```

---

## Self-Review

- **Spec coverage：** §2 信源→Task 2 prompt；§3 SOP→Task 2；§4 schema→Task 7（+Task 1 状态文件、Task 5 log 事件、Task 6 skill）；§5 并行/试点/聚合→Task 3/4/5；§6 skill→Task 6；§7 顺序→Task 1-7；§8 风险（幂等/门控/防冲突）→Task 1 diff、Task 3 门控、Task 2 红线。无遗漏。
- **Placeholder scan：** prompt 模板占位符 `{{TYPE}}/{{PAGE_LIST}}` 在 Task 3/4 明确赋值；无 TBD/TODO。
- **一致性：** `.verified.tsv` 格式（path\tdate\tstatus）在 Task 1/3/4 一致；STATUS 枚举 verified|skipped|error 在 Task 2/4/5 一致；笔误 vs ⚠️ 界定全程同 spec §3。
