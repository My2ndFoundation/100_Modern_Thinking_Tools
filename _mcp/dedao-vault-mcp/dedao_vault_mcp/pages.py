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
