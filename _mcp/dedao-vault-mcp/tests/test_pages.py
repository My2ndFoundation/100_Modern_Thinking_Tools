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


def test_parse_frontmatter_preserves_body_horizontal_rule():
    text = "---\ntype: tool\n---\n\nintro\n\n---\n\nmore\n"
    fm, body = parse_frontmatter(text)
    assert fm["type"] == "tool"
    assert "intro" in body and "more" in body and "---" in body


def test_parse_frontmatter_ignores_non_leading_delimiter():
    text = "----not frontmatter\nbody\n"
    fm, body = parse_frontmatter(text)
    assert fm == {}
    assert body == text


def test_one_liner_falls_back_to_jianjie():
    assert one_liner({"简介": "首行。\n后续行。"}) == "首行。"


def test_one_liner_empty_when_no_sections():
    assert one_liner({}) == ""


def test_parse_page_tags(tmp_path):
    p = tmp_path / "叙事.md"
    p.write_text(DOC, encoding="utf-8")
    assert "板块/基本世界观" in parse_page(p).tags
