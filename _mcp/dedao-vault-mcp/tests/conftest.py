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
