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
    if not column or not column.strip():
        raise ValueError("path_rejected")
    root = Path(creation_root).resolve()
    target = (root / column).resolve()
    if target == root or root not in target.parents:
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
    fm = {"type": "draft", "column": column, "format": format}
    if language is not None:
        fm["language"] = language
    fm["covers"] = list(covers)
    fm["status"] = "pending-review"
    fm["created"] = date
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
        if column.startswith("_"):
            return []
        try:
            dirs = [_safe_dir(creation_root, column)]
        except ValueError:
            return []
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
