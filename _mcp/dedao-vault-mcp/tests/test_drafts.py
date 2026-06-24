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


def test_save_draft_rejects_empty_column(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    assert save_draft(c, "", "social", "x", "b", [], today="2026-06-24")["error"] == "path_rejected"


def test_save_draft_rejects_dot_column(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    assert save_draft(c, ".", "social", "x", "b", [], today="2026-06-24")["error"] == "path_rejected"


def test_list_drafts_skips_underscore_column(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    save_draft(c, "uk", "social", "X", "b", ["[[叙事]]"], today="2026-06-20")
    assert list_drafts(c, column="_prompts") == []


def test_list_drafts_rejects_traversal_column(tmp_path):
    c = tmp_path / "创作"
    c.mkdir()
    (tmp_path / "工具").mkdir()
    (tmp_path / "工具" / "secret.md").write_text("---\ncolumn: x\n---\nbody\n", encoding="utf-8")
    assert list_drafts(c, column="../工具") == []
