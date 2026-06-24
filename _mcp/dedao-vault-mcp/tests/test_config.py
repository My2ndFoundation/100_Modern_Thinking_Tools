# tests/test_config.py
import os
from pathlib import Path
from dedao_vault_mcp.config import WIKI_FOLDERS, CREATION_FOLDER, resolve_root


def test_folder_constants():
    assert WIKI_FOLDERS == ["工具", "概念", "人物", "著作", "来源"]
    assert CREATION_FOLDER == "创作"


def test_resolve_root_uses_env(monkeypatch, tmp_path):
    monkeypatch.setenv("DEDAO_VAULT_ROOT", str(tmp_path))
    assert resolve_root() == tmp_path.resolve()


def test_find_root_upwards_success(tmp_path):
    from dedao_vault_mcp.config import _find_root_upwards
    vault = tmp_path / "vault"
    (vault / "工具").mkdir(parents=True)
    (vault / "CLAUDE.md").write_text("x", encoding="utf-8")
    start = vault / "_mcp" / "pkg" / "config.py"
    start.parent.mkdir(parents=True)
    start.write_text("", encoding="utf-8")
    assert _find_root_upwards(start) == vault.resolve()


def test_find_root_upwards_not_found(tmp_path):
    from dedao_vault_mcp.config import _find_root_upwards
    start = tmp_path / "a" / "b" / "config.py"
    start.parent.mkdir(parents=True)
    start.write_text("", encoding="utf-8")
    assert _find_root_upwards(start) is None
