# tests/test_server.py
import importlib

import dedao_vault_mcp.server as srv


def test_tools_registered(monkeypatch, fake_vault):
    # point the server at the fake vault and reload so module-level init runs
    monkeypatch.setenv("DEDAO_VAULT_ROOT", str(fake_vault))
    importlib.reload(srv)
    names = {"search_pages", "get_page", "get_backlinks", "get_related",
             "pick_topics", "list_columns", "get_column",
             "save_draft", "list_drafts", "refresh_index"}
    assert names.issubset(set(srv.list_tool_names()))


def test_pick_topics_excludes_written(monkeypatch, fake_vault):
    monkeypatch.setenv("DEDAO_VAULT_ROOT", str(fake_vault))
    importlib.reload(srv)
    srv.save_draft("uk", "social", "x", "body", ["[[叙事]]"])
    out = srv.pick_topics("by_tag", tag="板块/基本世界观")
    assert all(o["name"] != "叙事" for o in out)
