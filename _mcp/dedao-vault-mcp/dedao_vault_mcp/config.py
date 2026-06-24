# dedao_vault_mcp/config.py
import os
from pathlib import Path

WIKI_FOLDERS = ["工具", "概念", "人物", "著作", "来源"]
CREATION_FOLDER = "创作"


def resolve_root() -> Path:
    env = os.environ.get("DEDAO_VAULT_ROOT")
    if env:
        return Path(env).expanduser().resolve()
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "CLAUDE.md").exists() and (parent / "工具").is_dir():
            return parent
    raise RuntimeError("Cannot locate vault root; set DEDAO_VAULT_ROOT")
