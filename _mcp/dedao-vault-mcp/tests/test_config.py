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
