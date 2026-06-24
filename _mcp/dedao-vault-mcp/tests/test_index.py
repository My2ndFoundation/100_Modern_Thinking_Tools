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
