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
    assert [o["name"] for o in out] == ["叙事", "认知解耦"]


def test_exclude_written(fake_vault):
    idx = build_index(fake_vault)
    out = pick_topics(idx, "by_tag", tag="板块/基本世界观",
                      written_covers=frozenset({"叙事"}))
    assert all(o["name"] != "叙事" for o in out)


def test_count_limits_results(fake_vault):
    idx = build_index(fake_vault)
    out = pick_topics(idx, "by_tag", tag="板块/基本世界观", count=1)
    assert len(out) == 1
    assert out[0]["name"] == "叙事"


def test_unknown_mode_raises(fake_vault):
    idx = build_index(fake_vault)
    with pytest.raises(ValueError):
        pick_topics(idx, "nonsense")
