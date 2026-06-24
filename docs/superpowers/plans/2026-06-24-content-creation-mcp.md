# DeDao Vault Content-Creation MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Python MCP server (`dedao-vault-mcp`) that exposes the wiki for search / topic-picking / draft-saving, plus the column config and English prompt templates that drive content creation from Claude Desktop.

**Architecture:** A read-only in-memory index over the five wiki folders (parsed at startup), exposed through ~10 FastMCP stdio tools. Writes are confined to the `创作/` folder. A parameterised English master prompt reads a per-column config (`创作/_栏目.yaml`) and produces a review-ready draft in `创作/<column>/`.

**Tech Stack:** Python ≥3.10, `mcp` (FastMCP, stdio), `pyyaml`, `pytest`, `uv`.

## Global Constraints

- Python `requires-python = ">=3.10"` (needs `X | None` typing).
- Dependencies: `mcp>=1.2`, `pyyaml>=6`. Dev: `pytest>=8`.
- MCP API: `from mcp.server.fastmcp import FastMCP`; `@mcp.tool()`; `mcp.run()` (stdio default). This is the stable v1 API and is Claude-Desktop compatible.
- **Never** write outside `创作/`. **Never** modify `工具/ 概念/ 人物/ 著作/ 来源/` or `raw/`.
- Every core function takes an explicit `root: Path` argument so it is testable; **only** `server.py` resolves the real vault root (env `DEDAO_VAULT_ROOT`, else walk-up).
- Wiki folders, in scan order: `工具 概念 人物 著作 来源`. Creation folder: `创作`.
- Drafts default `language: en-GB`; a column may set `language: zh` to override.
- All MCP tool returns are JSON-serialisable `dict` / `list[dict]`.
- TDD: write the failing test first; commit after each green task.
- Run tests from `_mcp/dedao-vault-mcp/`: `uv run pytest`.

---

### Task 1: Project scaffolding + config

**Files:**
- Create: `_mcp/dedao-vault-mcp/pyproject.toml`
- Create: `_mcp/dedao-vault-mcp/dedao_vault_mcp/__init__.py`
- Create: `_mcp/dedao-vault-mcp/dedao_vault_mcp/config.py`
- Test: `_mcp/dedao-vault-mcp/tests/test_config.py`

**Interfaces:**
- Produces: `WIKI_FOLDERS: list[str]`, `CREATION_FOLDER: str`, `resolve_root() -> Path` (reads `DEDAO_VAULT_ROOT`, else walks up from the package file to a dir containing both `CLAUDE.md` and `工具/`).

- [ ] **Step 1: Write `pyproject.toml`**

```toml
[project]
name = "dedao-vault-mcp"
version = "0.1.0"
description = "Local MCP server exposing the DeDao-100 wiki for content creation"
requires-python = ">=3.10"
dependencies = ["mcp>=1.2", "pyyaml>=6"]

[project.optional-dependencies]
dev = ["pytest>=8"]

[project.scripts]
dedao-vault-mcp = "dedao_vault_mcp.server:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.pytest.ini_options]
pythonpath = ["."]
```

- [ ] **Step 2: Create empty `dedao_vault_mcp/__init__.py`**

```python
"""dedao-vault-mcp: local MCP server over the DeDao-100 wiki."""
```

- [ ] **Step 3: Write the failing test**

```python
# tests/test_config.py
import os
from pathlib import Path
from dedao_vault_mcp.config import WIKI_FOLDERS, CREATION_FOLDER, resolve_root


def test_folder_constants():
    assert WIKI_FOLDERS == ["工具", "概念", "人物", "著作", "来源"]
    assert CREATION_FOLDER == "创作"


def test_resolve_root_uses_env(monkeypatch, tmp_path):
    monkeypatch.setenv("DEDAO_VAULT_ROOT", str(tmp_path))
    assert resolve_root() == tmp_path.resolve()
```

- [ ] **Step 4: Run test to verify it fails**

Run: `uv run pytest tests/test_config.py -v`
Expected: FAIL with `ModuleNotFoundError: dedao_vault_mcp.config`

- [ ] **Step 5: Implement `config.py`**

```python
# dedao_vault_mcp/config.py
import os
from pathlib import Path

WIKI_FOLDERS = ["工具", "概念", "人物", "著作", "来源"]
CREATION_FOLDER = "创作"


def resolve_root() -> Path:
    env = os.environ.get("DEDAO_VAULT_ROOT")
    if env:
        return Path(env).expanduser().resolve()
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "CLAUDE.md").exists() and (parent / "工具").is_dir():
            return parent
    raise RuntimeError("Cannot locate vault root; set DEDAO_VAULT_ROOT")
```

- [ ] **Step 6: Run test to verify it passes**

Run: `uv run pytest tests/test_config.py -v`
Expected: PASS (2 passed)

- [ ] **Step 7: Commit**

```bash
git add _mcp/dedao-vault-mcp/pyproject.toml _mcp/dedao-vault-mcp/dedao_vault_mcp/__init__.py _mcp/dedao-vault-mcp/dedao_vault_mcp/config.py _mcp/dedao-vault-mcp/tests/test_config.py
git commit -m "feat(mcp): scaffold dedao-vault-mcp package + config"
```

---

### Task 2: Page parsing (`pages.py`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/dedao_vault_mcp/pages.py`
- Test: `_mcp/dedao-vault-mcp/tests/test_pages.py`

**Interfaces:**
- Produces:
  - `Page` dataclass: `name, path, type, aliases, tags, frontmatter, sections, body, outlinks`.
  - `parse_frontmatter(text: str) -> tuple[dict, str]`
  - `parse_sections(body: str) -> dict[str, str]` (keys = `## ` headings)
  - `parse_link_target(raw: str) -> str` (`"[[X|y]]"` / `"X#h"` → `"X"`)
  - `extract_outlinks(body: str) -> list[str]` (ordered, deduped)
  - `one_liner(sections: dict) -> str` (一句话定义 → 简介 → "")
  - `parse_page(path: Path) -> Page` (may raise on bad YAML)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_pages.py
from dedao_vault_mcp.pages import (
    parse_frontmatter, parse_sections, parse_link_target,
    extract_outlinks, one_liner, parse_page,
)

DOC = """---
type: tool
aliases: [Narrative, 叙事法]
tags: [板块/基本世界观]
---

## 一句话定义
对事实的连贯描述。
第二行不算一句话定义。

## 相关工具
- [[叙事权]]
- [[认知解耦|解耦]]
"""


def test_parse_frontmatter_splits_fm_and_body():
    fm, body = parse_frontmatter(DOC)
    assert fm["type"] == "tool"
    assert body.startswith("## 一句话定义")


def test_parse_sections_keys():
    _, body = parse_frontmatter(DOC)
    sections = parse_sections(body)
    assert "一句话定义" in sections
    assert "相关工具" in sections


def test_parse_link_target_strips_alias_and_heading():
    assert parse_link_target("[[认知解耦|解耦]]") == "认知解耦"
    assert parse_link_target("叙事权#用法") == "叙事权"


def test_extract_outlinks_dedup_ordered():
    assert extract_outlinks(DOC) == ["叙事权", "认知解耦"]


def test_one_liner_first_line_only():
    _, body = parse_frontmatter(DOC)
    assert one_liner(parse_sections(body)) == "对事实的连贯描述。"


def test_parse_page(tmp_path):
    p = tmp_path / "叙事.md"
    p.write_text(DOC, encoding="utf-8")
    page = parse_page(p)
    assert page.name == "叙事"
    assert page.type == "tool"
    assert "Narrative" in page.aliases
    assert page.outlinks == ["叙事权", "认知解耦"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_pages.py -v`
Expected: FAIL with `ModuleNotFoundError: dedao_vault_mcp.pages`

- [ ] **Step 3: Implement `pages.py`**

```python
# dedao_vault_mcp/pages.py
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


@dataclass
class Page:
    name: str
    path: str
    type: str | None
    aliases: list[str]
    tags: list[str]
    frontmatter: dict
    sections: dict
    body: str
    outlinks: list[str] = field(default_factory=list)


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            fm = yaml.safe_load(parts[1]) or {}
            if not isinstance(fm, dict):
                fm = {}
            return fm, parts[2].lstrip("\n")
    return {}, text


def parse_sections(body: str) -> dict:
    sections: dict[str, str] = {}
    current = None
    buf: list[str] = []
    for line in body.splitlines():
        if line.startswith("## "):
            if current is not None:
                sections[current] = "\n".join(buf).strip()
            current = line[3:].strip()
            buf = []
        elif current is not None:
            buf.append(line)
    if current is not None:
        sections[current] = "\n".join(buf).strip()
    return sections


def parse_link_target(raw: str) -> str:
    s = raw.strip()
    if s.startswith("[[") and s.endswith("]]"):
        s = s[2:-2]
    s = s.split("|", 1)[0]
    s = s.split("#", 1)[0]
    return s.strip()


def extract_outlinks(body: str) -> list[str]:
    seen: list[str] = []
    for m in WIKILINK_RE.finditer(body):
        target = parse_link_target(m.group(1))
        if target and target not in seen:
            seen.append(target)
    return seen


def one_liner(sections: dict) -> str:
    for key in ("一句话定义", "简介"):
        text = (sections.get(key) or "").strip()
        if text:
            return text.splitlines()[0].strip()
    return ""


def parse_page(path: Path) -> Page:
    text = path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    return Page(
        name=path.stem,
        path=str(path),
        type=fm.get("type"),
        aliases=[a for a in (fm.get("aliases") or []) if isinstance(a, str)],
        tags=[t for t in (fm.get("tags") or []) if isinstance(t, str)],
        frontmatter=fm,
        sections=parse_sections(body),
        body=body,
        outlinks=extract_outlinks(body),
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_pages.py -v`
Expected: PASS (6 passed)

- [ ] **Step 5: Commit**

```bash
git add _mcp/dedao-vault-mcp/dedao_vault_mcp/pages.py _mcp/dedao-vault-mcp/tests/test_pages.py
git commit -m "feat(mcp): page parsing (frontmatter, sections, wikilinks)"
```

---

### Task 3: Vault index + retrieval (`index.py`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/dedao_vault_mcp/index.py`
- Test: `_mcp/dedao-vault-mcp/tests/conftest.py`
- Test: `_mcp/dedao-vault-mcp/tests/test_index.py`

**Interfaces:**
- Consumes: `pages.Page`, `pages.parse_page`, `pages.one_liner`, `pages.parse_link_target`, `pages.WIKILINK_RE`.
- Produces:
  - `VaultIndex` dataclass: `pages: dict[str,Page]`, `alias_index: dict[str,str]`, `backlinks: dict[str,set[str]]`, `warnings: list[str]`.
  - `build_index(root: Path) -> VaultIndex`
  - `resolve(index, name: str) -> str | None`
  - `search(index, query, type=None, tag=None, limit=20) -> list[dict]` → `{name,type,one_liner,score,path}`
  - `page_view(index, name) -> dict` → full page or `{error:"not_found", suggestions:[...]}`
  - `backlinks_view(index, name) -> list[dict] | dict`
  - `related_view(index, name) -> list[dict] | dict` (`reason` ∈ `section:相关工具`/`co-cited:<source>`)

- [ ] **Step 1: Write the shared fixture**

```python
# tests/conftest.py
import textwrap
import pytest


def _w(path, body):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(body).lstrip("\n"), encoding="utf-8")


@pytest.fixture
def fake_vault(tmp_path):
    _w(tmp_path / "工具" / "叙事.md", """
    ---
    type: tool
    aliases: [Narrative]
    tags: [板块/基本世界观]
    updated: 2026-05-15
    ---
    ## 一句话定义
    对事实的连贯描述。
    ## 相关工具
    - [[认知解耦]]
    """)
    _w(tmp_path / "工具" / "认知解耦.md", """
    ---
    type: tool
    tags: [板块/基本世界观]
    updated: 2026-06-01
    ---
    ## 一句话定义
    把叙事和事实拆开。
    """)
    _w(tmp_path / "人物" / "万维钢.md", """
    ---
    type: person
    aliases: [Wan Weigang]
    updated: 2026-04-01
    ---
    ## 简介
    科学作家，讲叙事与认知解耦。
    """)
    _w(tmp_path / "来源" / "叙事这节课.md", """
    ---
    type: source
    updated: 2026-05-15
    ---
    ## 关键概念
    - [[叙事]]
    - [[认知解耦]]
    """)
    # broken frontmatter — must be skipped, not crash
    _w(tmp_path / "概念" / "坏页.md", """
    ---
    type: concept
    aliases: [unclosed
    ---
    ## 一句话定义
    坏的 YAML。
    """)
    (tmp_path / "创作").mkdir()
    (tmp_path / "CLAUDE.md").write_text("x", encoding="utf-8")
    return tmp_path
```

- [ ] **Step 2: Write the failing test**

```python
# tests/test_index.py
from dedao_vault_mcp.index import (
    build_index, resolve, search, page_view, backlinks_view, related_view,
)


def test_build_index_skips_broken_and_indexes_rest(fake_vault):
    idx = build_index(fake_vault)
    assert "叙事" in idx.pages and "认知解耦" in idx.pages and "万维钢" in idx.pages
    assert "坏页" not in idx.pages
    assert any("坏页" in w for w in idx.warnings)


def test_resolve_by_alias(fake_vault):
    idx = build_index(fake_vault)
    assert resolve(idx, "Narrative") == "叙事"
    assert resolve(idx, "叙事") == "叙事"
    assert resolve(idx, "不存在") is None


def test_search_ranks_title_over_body(fake_vault):
    idx = build_index(fake_vault)
    hits = search(idx, "叙事")
    assert hits[0]["name"] == "叙事"
    assert hits[0]["score"] >= hits[-1]["score"]


def test_search_type_filter(fake_vault):
    idx = build_index(fake_vault)
    assert all(h["type"] == "person" for h in search(idx, "叙事", type="person"))


def test_page_view_not_found_has_suggestions(fake_vault):
    idx = build_index(fake_vault)
    out = page_view(idx, "叙事x")
    assert out["error"] == "not_found"


def test_backlinks(fake_vault):
    idx = build_index(fake_vault)
    names = {b["name"] for b in backlinks_view(idx, "认知解耦")}
    assert "叙事" in names and "叙事这节课" in names


def test_related_includes_section_and_cocitation(fake_vault):
    idx = build_index(fake_vault)
    rel = {r["name"]: r["reason"] for r in related_view(idx, "叙事")}
    assert "认知解耦" in rel
```

- [ ] **Step 3: Run test to verify it fails**

Run: `uv run pytest tests/test_index.py -v`
Expected: FAIL with `ModuleNotFoundError: dedao_vault_mcp.index`

- [ ] **Step 4: Implement `index.py`**

```python
# dedao_vault_mcp/index.py
import difflib
from dataclasses import dataclass, field
from pathlib import Path

from .config import WIKI_FOLDERS
from .pages import (
    Page, parse_page, one_liner, parse_link_target, WIKILINK_RE,
)


@dataclass
class VaultIndex:
    pages: dict
    alias_index: dict
    backlinks: dict
    warnings: list = field(default_factory=list)


def build_index(root: Path) -> VaultIndex:
    pages: dict[str, Page] = {}
    alias_index: dict[str, str] = {}
    warnings: list[str] = []
    for folder in WIKI_FOLDERS:
        d = Path(root) / folder
        if not d.is_dir():
            continue
        for path in sorted(d.glob("*.md")):
            try:
                page = parse_page(path)
            except Exception as e:  # bad YAML etc. — skip, do not crash
                warnings.append(f"{path}: {e}")
                continue
            pages[page.name] = page
            alias_index[page.name.lower()] = page.name
            for a in page.aliases:
                alias_index[a.lower()] = page.name
    backlinks: dict[str, set] = {}
    for page in pages.values():
        for target in page.outlinks:
            canon = alias_index.get(target.lower())
            if canon:
                backlinks.setdefault(canon, set()).add(page.name)
    return VaultIndex(pages=pages, alias_index=alias_index,
                      backlinks=backlinks, warnings=warnings)


def resolve(index: VaultIndex, name: str):
    if name in index.pages:
        return name
    return index.alias_index.get(name.lower())


def _suggest(index: VaultIndex, name: str, k: int = 5):
    return difflib.get_close_matches(name.lower(), list(index.alias_index), n=k)


def _score(page: Page, q: str) -> int:
    if not q:
        return 0
    name = page.name.lower()
    if q == name:
        return 100
    if q in name:
        return 80
    if any(q in a.lower() for a in page.aliases):
        return 60
    if q in one_liner(page.sections).lower():
        return 40
    if q in page.body.lower():
        return 20
    return 0


def search(index: VaultIndex, query: str, type=None, tag=None, limit: int = 20):
    q = query.lower().strip()
    scored = []
    for page in index.pages.values():
        if type and page.type != type:
            continue
        if tag and tag not in page.tags:
            continue
        s = _score(page, q)
        if s > 0:
            scored.append((s, page))
    scored.sort(key=lambda x: (-x[0], x[1].name))
    return [
        {"name": p.name, "type": p.type, "one_liner": one_liner(p.sections),
         "score": s, "path": p.path}
        for s, p in scored[:limit]
    ]


def page_view(index: VaultIndex, name: str):
    canon = resolve(index, name)
    if not canon:
        return {"error": "not_found", "suggestions": _suggest(index, name)}
    p = index.pages[canon]
    outlinks = []
    for o in p.outlinks:
        t = resolve(index, o)
        if t and t not in outlinks:
            outlinks.append(t)
    return {"name": p.name, "type": p.type, "aliases": p.aliases,
            "tags": p.tags, "frontmatter": p.frontmatter,
            "sections": p.sections, "outlinks": outlinks, "path": p.path}


def backlinks_view(index: VaultIndex, name: str):
    canon = resolve(index, name)
    if not canon:
        return {"error": "not_found", "suggestions": _suggest(index, name)}
    return [
        {"name": index.pages[s].name, "type": index.pages[s].type,
         "one_liner": one_liner(index.pages[s].sections)}
        for s in sorted(index.backlinks.get(canon, set()))
    ]


def related_view(index: VaultIndex, name: str):
    canon = resolve(index, name)
    if not canon:
        return {"error": "not_found", "suggestions": _suggest(index, name)}
    p = index.pages[canon]
    related: dict[str, str] = {}
    for key in ("相关工具", "相关概念"):
        for raw in WIKILINK_RE.findall(p.sections.get(key, "")):
            t = resolve(index, parse_link_target(raw))
            if t and t != canon:
                related.setdefault(t, f"section:{key}")
    sources = [s for s in index.backlinks.get(canon, set())
               if index.pages[s].type == "source"]
    for src in sources:
        for co in index.pages[src].outlinks:
            t = resolve(index, co)
            if (t and t != canon and t not in related
                    and index.pages[t].type in ("tool", "concept")):
                related.setdefault(t, f"co-cited:{src}")
    return [
        {"name": index.pages[t].name, "type": index.pages[t].type,
         "one_liner": one_liner(index.pages[t].sections), "reason": r}
        for t, r in related.items()
    ]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `uv run pytest tests/test_index.py -v`
Expected: PASS (7 passed)

- [ ] **Step 6: Commit**

```bash
git add _mcp/dedao-vault-mcp/dedao_vault_mcp/index.py _mcp/dedao-vault-mcp/tests/conftest.py _mcp/dedao-vault-mcp/tests/test_index.py
git commit -m "feat(mcp): vault index, search, backlinks, related"
```

---

### Task 4: Topic picker (`topics.py`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/dedao_vault_mcp/topics.py`
- Test: `_mcp/dedao-vault-mcp/tests/test_topics.py`

**Interfaces:**
- Consumes: `index.VaultIndex`, `index.build_index`, `pages.one_liner`.
- Produces: `pick_topics(index, mode, type=None, tag=None, count=5, written_covers=frozenset()) -> list[dict]` → `{name,type,one_liner,why}`. `mode ∈ {random, by_tag, recently_updated, least_linked, unused}`; unknown mode raises `ValueError`. `written_covers` holds canonical names to exclude.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_topics.py
import pytest
from dedao_vault_mcp.index import build_index
from dedao_vault_mcp.topics import pick_topics


def test_recently_updated_order(fake_vault):
    idx = build_index(fake_vault)
    out = pick_topics(idx, "recently_updated", type="tool")
    assert [o["name"] for o in out] == ["认知解耦", "叙事"]


def test_least_linked_first(fake_vault):
    idx = build_index(fake_vault)
    out = pick_topics(idx, "least_linked", type="tool")
    # 叙事 has 0 backlinks, 认知解耦 has backlinks -> 叙事 first
    assert out[0]["name"] == "叙事"


def test_by_tag_filters(fake_vault):
    idx = build_index(fake_vault)
    out = pick_topics(idx, "by_tag", tag="板块/基本世界观")
    assert {o["name"] for o in out} == {"叙事", "认知解耦"}


def test_exclude_written(fake_vault):
    idx = build_index(fake_vault)
    out = pick_topics(idx, "by_tag", tag="板块/基本世界观",
                      written_covers=frozenset({"叙事"}))
    assert all(o["name"] != "叙事" for o in out)


def test_unknown_mode_raises(fake_vault):
    idx = build_index(fake_vault)
    with pytest.raises(ValueError):
        pick_topics(idx, "nonsense")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_topics.py -v`
Expected: FAIL with `ModuleNotFoundError: dedao_vault_mcp.topics`

- [ ] **Step 3: Implement `topics.py`**

```python
# dedao_vault_mcp/topics.py
import random

from .index import VaultIndex
from .pages import one_liner

VALID_MODES = {"random", "by_tag", "recently_updated", "least_linked", "unused"}


def pick_topics(index: VaultIndex, mode: str, type=None, tag=None,
                count: int = 5, written_covers=frozenset()):
    if mode not in VALID_MODES:
        raise ValueError(f"unknown mode: {mode}")
    cand = [
        p for p in index.pages.values()
        if (not type or p.type == type)
        and (not tag or tag in p.tags)
        and p.name not in written_covers
    ]
    if mode == "recently_updated":
        cand.sort(key=lambda p: str(p.frontmatter.get("updated", "")), reverse=True)
    elif mode == "least_linked":
        cand.sort(key=lambda p: (len(index.backlinks.get(p.name, set())), p.name))
    elif mode == "random":
        random.shuffle(cand)
    else:  # by_tag, unused
        cand.sort(key=lambda p: p.name)

    def why(p):
        if mode == "least_linked":
            return f"backlinks={len(index.backlinks.get(p.name, set()))}"
        if mode == "recently_updated":
            return f"updated={p.frontmatter.get('updated', '')}"
        return mode

    return [
        {"name": p.name, "type": p.type,
         "one_liner": one_liner(p.sections), "why": why(p)}
        for p in cand[:count]
    ]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_topics.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add _mcp/dedao-vault-mcp/dedao_vault_mcp/topics.py _mcp/dedao-vault-mcp/tests/test_topics.py
git commit -m "feat(mcp): pick_topics with 5 modes + exclude_written"
```

---

### Task 5: Column config (`columns.py`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/dedao_vault_mcp/columns.py`
- Test: `_mcp/dedao-vault-mcp/tests/test_columns.py`

**Interfaces:**
- Produces:
  - `load_columns(creation_root) -> list[dict] | dict` (error dict on missing/bad file)
  - `list_columns(creation_root) -> list[dict] | dict` → summaries `{id,name,format,language,topic_mode}`
  - `get_column(creation_root, id) -> dict` (full column, or `{error, available:[...]}`)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_columns.py
import textwrap
from dedao_vault_mcp.columns import load_columns, list_columns, get_column

YAML = """
columns:
  - id: thinking-tools-uk
    name: Thinking Tools (UK)
    format: social
    language: en-GB
    topic_mode: rotation
  - id: daily-tool-zh
    name: 每日一个思维工具
    format: social
    language: zh
    topic_mode: rotation
"""


def _seed(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    (c / "_栏目.yaml").write_text(textwrap.dedent(YAML).lstrip("\n"), encoding="utf-8")
    return c


def test_load_columns(tmp_path):
    c = _seed(tmp_path)
    cols = load_columns(c)
    assert [x["id"] for x in cols] == ["thinking-tools-uk", "daily-tool-zh"]


def test_list_columns_summary(tmp_path):
    c = _seed(tmp_path)
    s = list_columns(c)[0]
    assert set(s) == {"id", "name", "format", "language", "topic_mode"}


def test_get_column_found_and_missing(tmp_path):
    c = _seed(tmp_path)
    assert get_column(c, "daily-tool-zh")["language"] == "zh"
    miss = get_column(c, "nope")
    assert miss["error"] == "column_not_found"
    assert "thinking-tools-uk" in miss["available"]


def test_missing_file(tmp_path):
    (tmp_path / "创作").mkdir()
    assert load_columns(tmp_path / "创作")["error"] == "columns_file_missing"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_columns.py -v`
Expected: FAIL with `ModuleNotFoundError: dedao_vault_mcp.columns`

- [ ] **Step 3: Implement `columns.py`**

```python
# dedao_vault_mcp/columns.py
from pathlib import Path

import yaml

_SUMMARY_KEYS = ("id", "name", "format", "language", "topic_mode")


def _columns_path(creation_root) -> Path:
    return Path(creation_root) / "_栏目.yaml"


def load_columns(creation_root):
    path = _columns_path(creation_root)
    if not path.exists():
        return {"error": "columns_file_missing", "path": str(path)}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as e:
        return {"error": "yaml_error", "detail": str(e)}
    cols = data.get("columns") or []
    return [c for c in cols if isinstance(c, dict) and "id" in c]


def list_columns(creation_root):
    cols = load_columns(creation_root)
    if isinstance(cols, dict):
        return cols
    return [{k: c.get(k) for k in _SUMMARY_KEYS} for c in cols]


def get_column(creation_root, id: str):
    cols = load_columns(creation_root)
    if isinstance(cols, dict):
        return cols
    for c in cols:
        if c.get("id") == id:
            return c
    return {"error": "column_not_found", "available": [c.get("id") for c in cols]}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_columns.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add _mcp/dedao-vault-mcp/dedao_vault_mcp/columns.py _mcp/dedao-vault-mcp/tests/test_columns.py
git commit -m "feat(mcp): column config loader"
```

---

### Task 6: Draft save/list with path guard (`drafts.py`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/dedao_vault_mcp/drafts.py`
- Test: `_mcp/dedao-vault-mcp/tests/test_drafts.py`

**Interfaces:**
- Consumes: `pages.parse_frontmatter`.
- Produces:
  - `slugify(title: str) -> str`
  - `save_draft(creation_root, column, format, title, body, covers, language=None, today=None) -> dict` → `{path,status:"saved"}` or `{error:"path_rejected"}`. Writes frontmatter (`type:draft, column, format, language, covers, status:"pending-review", created`) + body + a `## 用到的知识库页面` list. `today` (ISO date str) is injectable for deterministic tests.
  - `list_drafts(creation_root, column=None, limit=50) -> list[dict]` → `{path,column,title,covers,created,status}`, newest first; skips `_`-prefixed dirs.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_drafts.py
from dedao_vault_mcp.drafts import slugify, save_draft, list_drafts


def test_slugify():
    assert slugify("Hello, World!") == "hello-world"
    assert slugify("叙事 的力量") == "叙事-的力量"


def test_save_draft_writes_file(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    res = save_draft(c, "uk", "social", "Narrative power",
                     "Body text.", ["[[叙事]]"], language="en-GB",
                     today="2026-06-24")
    assert res["status"] == "saved"
    text = (c / "uk" / "2026-06-24-narrative-power.md").read_text(encoding="utf-8")
    assert "type: draft" in text
    assert "language: en-GB" in text
    assert "[[叙事]]" in text
    assert "## 用到的知识库页面" in text


def test_save_draft_rejects_traversal(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    res = save_draft(c, "../工具", "social", "evil", "x", [], today="2026-06-24")
    assert res["error"] == "path_rejected"


def test_list_drafts_newest_first(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    save_draft(c, "uk", "social", "Old", "x", ["[[叙事]]"], today="2026-06-01")
    save_draft(c, "uk", "social", "New", "x", ["[[认知解耦]]"], today="2026-06-20")
    drafts = list_drafts(c)
    assert drafts[0]["created"] == "2026-06-20"
    assert drafts[0]["covers"] == ["[[认知解耦]]"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_drafts.py -v`
Expected: FAIL with `ModuleNotFoundError: dedao_vault_mcp.drafts`

- [ ] **Step 3: Implement `drafts.py`**

```python
# dedao_vault_mcp/drafts.py
import datetime
import re
from pathlib import Path

import yaml

from .pages import parse_frontmatter


def slugify(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"[^\w一-鿿]+", "-", s)
    return s.strip("-")[:50] or "draft"


def _safe_dir(creation_root, column: str) -> Path:
    root = Path(creation_root).resolve()
    target = (root / column).resolve()
    if target != root and root not in target.parents:
        raise ValueError("path_rejected")
    return target


def _frontmatter_block(fm: dict) -> str:
    body = yaml.safe_dump(fm, allow_unicode=True, sort_keys=False).strip()
    return f"---\n{body}\n---"


def save_draft(creation_root, column, format, title, body, covers,
               language=None, today=None) -> dict:
    try:
        d = _safe_dir(creation_root, column)
    except ValueError:
        return {"error": "path_rejected"}
    d.mkdir(parents=True, exist_ok=True)
    date = today or datetime.date.today().isoformat()
    path = d / f"{date}-{slugify(title)}.md"
    fm = {
        "type": "draft", "column": column, "format": format,
        "language": language, "covers": list(covers),
        "status": "pending-review", "created": date,
    }
    used = "\n".join(f"- {c}" for c in covers)
    content = (
        f"{_frontmatter_block(fm)}\n\n{body}\n\n"
        f"---\n## 用到的知识库页面\n{used}\n"
    )
    path.write_text(content, encoding="utf-8")
    return {"path": str(path), "status": "saved"}


def list_drafts(creation_root, column=None, limit: int = 50):
    root = Path(creation_root)
    if not root.exists():
        return []
    if column:
        dirs = [root / column]
    else:
        dirs = [p for p in root.iterdir() if p.is_dir() and not p.name.startswith("_")]
    out = []
    for d in dirs:
        if not d.is_dir():
            continue
        for path in sorted(d.glob("*.md")):
            fm, _ = parse_frontmatter(path.read_text(encoding="utf-8"))
            out.append({"path": str(path), "column": fm.get("column"),
                        "title": path.stem, "covers": fm.get("covers") or [],
                        "created": fm.get("created"), "status": fm.get("status")})
    out.sort(key=lambda x: str(x.get("created", "")), reverse=True)
    return out[:limit]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_drafts.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add _mcp/dedao-vault-mcp/dedao_vault_mcp/drafts.py _mcp/dedao-vault-mcp/tests/test_drafts.py
git commit -m "feat(mcp): save_draft/list_drafts with path guard"
```

---

### Task 7: FastMCP server wiring (`server.py`)

**Files:**
- Create: `_mcp/dedao-vault-mcp/dedao_vault_mcp/server.py`
- Test: `_mcp/dedao-vault-mcp/tests/test_server.py`

**Interfaces:**
- Consumes: everything above + `config.resolve_root`, `config.CREATION_FOLDER`, `pages.parse_link_target`.
- Produces: a module-level `mcp = FastMCP("dedao-vault")` with 10 registered tools, and `main()` calling `mcp.run()`. Tools: `search_pages, get_page, get_backlinks, get_related, pick_topics, list_columns, get_column, save_draft, list_drafts, refresh_index`. `pick_topics` resolves `exclude_written` by reading draft `covers` and mapping them to canonical names.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_server.py
import importlib

import dedao_vault_mcp.server as srv


def test_tools_registered(monkeypatch, fake_vault):
    # point the server at the fake vault and reload so module-level init runs
    monkeypatch.setenv("DEDAO_VAULT_ROOT", str(fake_vault))
    importlib.reload(srv)
    names = {"search_pages", "get_page", "get_backlinks", "get_related",
             "pick_topics", "list_columns", "get_column",
             "save_draft", "list_drafts", "refresh_index"}
    assert names.issubset(set(srv.list_tool_names()))


def test_pick_topics_excludes_written(monkeypatch, fake_vault):
    monkeypatch.setenv("DEDAO_VAULT_ROOT", str(fake_vault))
    importlib.reload(srv)
    srv.save_draft("uk", "social", "x", "body", ["[[叙事]]"])
    out = srv.pick_topics("by_tag", tag="板块/基本世界观")
    assert all(o["name"] != "叙事" for o in out)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_server.py -v`
Expected: FAIL with `ModuleNotFoundError: dedao_vault_mcp.server`

- [ ] **Step 3: Implement `server.py`**

```python
# dedao_vault_mcp/server.py
from mcp.server.fastmcp import FastMCP

from .config import resolve_root, CREATION_FOLDER
from . import index as idx
from . import topics as tp
from . import columns as col
from . import drafts as dr
from .pages import parse_link_target

mcp = FastMCP("dedao-vault")

_ROOT = resolve_root()
_CREATION = _ROOT / CREATION_FOLDER
_INDEX = idx.build_index(_ROOT)


@mcp.tool()
def search_pages(query: str, type: str | None = None,
                 tag: str | None = None, limit: int = 20) -> list[dict]:
    """Keyword/alias search over the wiki, ranked by hit location."""
    return idx.search(_INDEX, query, type, tag, limit)


@mcp.tool()
def get_page(name: str) -> dict:
    """Full page: frontmatter + sections + resolved outlinks. Resolves aliases."""
    return idx.page_view(_INDEX, name)


@mcp.tool()
def get_backlinks(name: str) -> list[dict] | dict:
    """Pages that link to this page."""
    return idx.backlinks_view(_INDEX, name)


@mcp.tool()
def get_related(name: str) -> list[dict] | dict:
    """Related pages via 相关工具/相关概念 sections and shared sources."""
    return idx.related_view(_INDEX, name)


@mcp.tool()
def pick_topics(mode: str, type: str | None = None, tag: str | None = None,
                count: int = 5, exclude_written: bool = True) -> list[dict]:
    """Candidate topics. mode: random|by_tag|recently_updated|least_linked|unused."""
    written = set()
    if exclude_written:
        for d in dr.list_drafts(_CREATION):
            for c in d.get("covers", []):
                t = idx.resolve(_INDEX, parse_link_target(c))
                if t:
                    written.add(t)
    return tp.pick_topics(_INDEX, mode, type, tag, count, frozenset(written))


@mcp.tool()
def list_columns() -> list[dict] | dict:
    """List configured content columns (创作/_栏目.yaml)."""
    return col.list_columns(_CREATION)


@mcp.tool()
def get_column(id: str) -> dict:
    """Full config for one column."""
    return col.get_column(_CREATION, id)


@mcp.tool()
def save_draft(column: str, format: str, title: str, body: str,
               covers: list[str], language: str | None = None) -> dict:
    """Save a review-ready draft under 创作/<column>/. Writes confined to 创作/."""
    return dr.save_draft(_CREATION, column, format, title, body, covers, language)


@mcp.tool()
def list_drafts(column: str | None = None, limit: int = 50) -> list[dict]:
    """List existing drafts (for dedup / review)."""
    return dr.list_drafts(_CREATION, column, limit)


@mcp.tool()
def refresh_index() -> dict:
    """Re-scan the wiki into memory."""
    global _INDEX
    _INDEX = idx.build_index(_ROOT)
    return {"pages_indexed": len(_INDEX.pages), "warnings": _INDEX.warnings}


def list_tool_names() -> list[str]:
    """Test helper: names of registered tools."""
    import anyio
    tools = anyio.run(mcp.list_tools)
    return [t.name for t in tools]


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_server.py -v`
Expected: PASS (2 passed)

> If `mcp.list_tools` is not awaitable in the installed SDK version, replace `list_tool_names` with `return list(mcp._tool_manager._tools.keys())` — keep the test assertion unchanged.

- [ ] **Step 5: Run the full suite**

Run: `uv run pytest -v`
Expected: PASS (all tasks' tests green)

- [ ] **Step 6: Commit**

```bash
git add _mcp/dedao-vault-mcp/dedao_vault_mcp/server.py _mcp/dedao-vault-mcp/tests/test_server.py
git commit -m "feat(mcp): FastMCP server wiring (10 tools)"
```

---

### Task 8: Column seed, prompt instances, README wiring

**Files:**
- Create: `创作/_栏目.yaml`
- Create: `创作/_prompts/thinking-tools-uk.md`
- Create: `创作/_prompts/daily-tool-zh.md`
- Create: `创作/README.md`
- Create: `_mcp/dedao-vault-mcp/README.md`

**Interfaces:**
- Consumes: the running MCP from Task 7; the master prompt template from the spec §5.4.
- Produces: ready-to-paste Claude Desktop task prompts and a wiring guide. (No code; verified by a manual end-to-end run.)

- [ ] **Step 1: Seed `创作/_栏目.yaml`**

```yaml
columns:
  - id: thinking-tools-uk
    name: Thinking Tools (UK)
    audience: UK-based lifelong learners on LinkedIn
    voice: clear, friendly, one practical takeaway each
    platform: LinkedIn
    format: social          # social | longform | script
    language: en-GB         # default; set zh to override
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
    language: zh
    topic_mode: rotation
    topic_filter: { type: tool, tag: 板块/决策 }
    length: 300字以内
    extras: 带3个话题标签
```

- [ ] **Step 2: Write `创作/_prompts/thinking-tools-uk.md`** (master template from spec §5.4, slots filled)

```
You are the content-creation assistant for the column "Thinking Tools (UK)".
Goal: produce ONE review-ready draft for this column and save it. Do not publish.

Available tools — dedao-vault-mcp:
  get_column, search_pages, get_page, get_related, get_backlinks,
  pick_topics, list_drafts, save_draft, refresh_index.

Steps:
1. Call get_column("thinking-tools-uk") to load config (audience / voice /
   platform / format / language / topic_mode / topic_filter / length / extras).
   The vault is in Chinese; the OUTPUT language is the column's `language`
   (en-GB here).
2. Decide the topic:
   - If I supplied "Topic: X" in this message, use X.
   - Else, since topic_mode is rotation, call
     pick_topics("rotation"... use type from topic_filter, exclude_written=true)
     and choose the single best candidate.
   - (If I instead supplied "Hotspot: Y", web-search to understand Y, then
     search_pages to find tools/concepts that resonate with it.)
   - Call list_drafts("thinking-tools-uk") to avoid repeating a recent topic.
3. Gather material: get_page on the chosen topic, then get_related /
   get_backlinks to find 2-3 connectable tools/concepts; search_pages to fill
   gaps. Use ONLY what the vault contains. For facts not in the vault: omit or
   flag explicitly — never invent. Take people/book names from each page's
   English `aliases`.
4. Write the draft — format=social: hook opening + 2-4 key points + ONE
   immediately usable action + close; respect `length`; add the reflective
   question per `extras`.
   Language en-GB: British spelling; IELTS ~6.5 / CEFR B2 difficulty;
   medium-length, clear sentences; avoid rare/literary vocabulary and very long
   complex clauses; plain phrasing is fine — it should read as if I wrote it.
5. Call save_draft(column="thinking-tools-uk", format="social", title=...,
   body=..., covers=[every wiki page you used], language="en-GB").
6. Report: title, saved path, pages used, and one sentence on why this topic.

Constraints: use only knowledge-base content (web search ONLY in hotspot mode,
and only to understand the hotspot). Do not publish — only save the draft.
```

- [ ] **Step 3: Write `创作/_prompts/daily-tool-zh.md`** (same template, `get_column("daily-tool-zh")`, format=social, language=zh following `voice`, `topic_filter` type=tool tag=板块/决策, 300字以内, 3 个话题标签). Mirror Step 2's structure exactly, swapping the column id, language profile (zh: follow `voice`, in Chinese), and the format/extras lines.

- [ ] **Step 4: Write `创作/README.md`**

```markdown
# 创作 / Drafts

LLM-generated, review-ready drafts. **Not published to Quartz** (not in the
sync list). Layout:

- `_栏目.yaml` — column configs (audience, voice, platform, format, language,
  topic mode). Edit to add/adjust columns.
- `_prompts/<column>.md` — ready-to-paste Claude Desktop task prompts.
- `<column>/YYYY-MM-DD-<slug>.md` — saved drafts (`status: pending-review`).

Workflow: paste a `_prompts/<column>.md` into a Claude Desktop task, trigger it
manually (add `Topic: …` or `Hotspot: …` when relevant), review the draft in
Obsidian, then publish by hand.
```

- [ ] **Step 5: Write `_mcp/dedao-vault-mcp/README.md`**

```markdown
# dedao-vault-mcp

Local MCP server exposing the DeDao-100 wiki for content creation.

## Install & run

    cd _mcp/dedao-vault-mcp
    uv sync
    uv run pytest          # all green

## Claude Desktop wiring

Add to `claude_desktop_config.json` → `mcpServers`:

    {
      "mcpServers": {
        "dedao-vault": {
          "command": "uv",
          "args": ["run", "--directory",
                   "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools/_mcp/dedao-vault-mcp",
                   "dedao-vault-mcp"],
          "env": {
            "DEDAO_VAULT_ROOT":
              "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
          }
        }
      }
    }

Restart Claude Desktop. Tools: search_pages, get_page, get_backlinks,
get_related, pick_topics, list_columns, get_column, save_draft, list_drafts,
refresh_index. Writes are confined to `创作/`.
```

- [ ] **Step 6: Manual end-to-end verification**

1. `uv run pytest` → all green.
2. Wire into Claude Desktop per the README; restart.
3. New task → paste `创作/_prompts/thinking-tools-uk.md` → trigger.
4. Confirm a draft appears at `创作/thinking-tools-uk/<date>-<slug>.md` with
   en-GB body, `covers`, and `status: pending-review`.
5. Eyeball the English level; if too advanced/native, tighten the IELTS-6.5
   wording in the prompt's language profile.

- [ ] **Step 7: Commit**

```bash
git add 创作/_栏目.yaml 创作/_prompts 创作/README.md _mcp/dedao-vault-mcp/README.md
git commit -m "feat(creation): column config, prompt instances, wiring docs"
```

---

## Self-Review

**Spec coverage:**
- §4.1 boundaries → Task 6 path guard (`_safe_dir`), read-only scans in Task 3. ✓
- §4.2 index model (3 tables + warnings) → Task 3 `VaultIndex`. ✓
- §4.3 all 10 tools → search_pages/get_page/get_backlinks/get_related (T3), pick_topics (T4+T7), list_columns/get_column (T5), save_draft/list_drafts (T6), refresh_index (T7). ✓
- §4.4 error handling → broken-FM skip (T3 test), not_found suggestions (T3), path_rejected (T6), empty results, yaml errors (T5). ✓
- §4.5 repo layout → matches Tasks 1–7 file paths. ✓
- §4.6 test coverage list → covered across T2–T7. ✓
- §5.1 column schema → Task 8 `_栏目.yaml`. ✓
- §5.2 language profiles (default en-GB / zh) → Task 8 prompt instances. ✓
- §5.3 draft format → Task 6 `save_draft` output. ✓
- §5.4 master prompt → Task 8 instances. ✓
- §5.5 per-column prompt files → Task 8 `_prompts/`. ✓
- §6 run flow + §7 decisions → Task 8 READMEs. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; Task 8 Step 3 references Step 2's structure but specifies every field to swap (acceptable — same file, adjacent steps).

**Type consistency:** `VaultIndex`, `pick_topics(..., written_covers=)`, `save_draft(..., today=)`, `resolve`, `parse_link_target`, `one_liner(sections)` used consistently across tasks. `list_columns`/`load_columns` return `list | dict(error)` consistently.
