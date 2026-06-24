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


def test_yaml_error(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    (c / "_栏目.yaml").write_text("columns: [1, 2", encoding="utf-8")
    assert load_columns(c)["error"] == "yaml_error"


def test_list_columns_passes_error_through(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    assert list_columns(c)["error"] == "columns_file_missing"


def test_get_column_passes_error_through(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    assert get_column(c, "x")["error"] == "columns_file_missing"
