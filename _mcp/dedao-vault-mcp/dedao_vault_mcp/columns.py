from pathlib import Path

import yaml

_SUMMARY_KEYS = ("id", "name", "format", "language", "topic_mode")


def _columns_path(creation_root) -> Path:
    return Path(creation_root) / "_栏目.yaml"


def load_columns(creation_root):
    path = _columns_path(creation_root)
    if not path.exists():
        return {"error": "columns_file_missing", "path": str(path)}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as e:
        return {"error": "yaml_error", "detail": str(e)}
    cols = data.get("columns") or []
    return [c for c in cols if isinstance(c, dict) and "id" in c]


def list_columns(creation_root):
    cols = load_columns(creation_root)
    if isinstance(cols, dict):
        return cols
    return [{k: c.get(k) for k in _SUMMARY_KEYS} for c in cols]


def get_column(creation_root, id: str):
    cols = load_columns(creation_root)
    if isinstance(cols, dict):
        return cols
    for c in cols:
        if c.get("id") == id:
            return c
    return {"error": "column_not_found", "available": [c.get("id") for c in cols]}
