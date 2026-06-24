import pytest

from dedao_vault_mcp.config import resolve_root, CREATION_FOLDER
from dedao_vault_mcp.index import build_index
from dedao_vault_mcp.columns import load_columns
from dedao_vault_mcp.topics import pick_topics


def test_real_columns_yield_candidates():
    """Each shipped column's topic_filter must match >=1 page in the real vault.
    Guards against tag/type drift as the wiki evolves."""
    try:
        root = resolve_root()
    except RuntimeError:
        pytest.skip("real vault root not found")
    creation = root / CREATION_FOLDER
    cols = load_columns(creation)
    if isinstance(cols, dict):
        pytest.skip("no real _栏目.yaml")
    idx = build_index(root)
    for col in cols:
        tf = col.get("topic_filter") or {}
        got = pick_topics(idx, "unused", type=tf.get("type"), tag=tf.get("tag"), count=5)
        assert got, f"column {col['id']} topic_filter {tf} yields no candidates"
