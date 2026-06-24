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
