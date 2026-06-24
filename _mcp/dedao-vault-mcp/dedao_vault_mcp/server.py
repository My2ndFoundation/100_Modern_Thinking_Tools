# dedao_vault_mcp/server.py
from mcp.server.fastmcp import FastMCP

from .config import resolve_root, CREATION_FOLDER
from . import index as idx
from . import topics as tp
from . import columns as col
from . import drafts as dr
from .pages import parse_link_target

mcp = FastMCP("dedao-vault")

_ROOT = resolve_root()
_CREATION = _ROOT / CREATION_FOLDER
_INDEX = idx.build_index(_ROOT)


@mcp.tool()
def search_pages(query: str, type: str | None = None,
                 tag: str | None = None, limit: int = 20) -> list[dict]:
    """Keyword/alias search over the wiki, ranked by hit location."""
    return idx.search(_INDEX, query, type, tag, limit)


@mcp.tool()
def get_page(name: str) -> dict:
    """Full page: frontmatter + sections + resolved outlinks. Resolves aliases."""
    return idx.page_view(_INDEX, name)


@mcp.tool()
def get_backlinks(name: str) -> list[dict] | dict:
    """Pages that link to this page."""
    return idx.backlinks_view(_INDEX, name)


@mcp.tool()
def get_related(name: str) -> list[dict] | dict:
    """Related pages via 相关工具/相关概念 sections and shared sources."""
    return idx.related_view(_INDEX, name)


@mcp.tool()
def pick_topics(mode: str, type: str | None = None, tag: str | None = None,
                count: int = 5, exclude_written: bool = True) -> list[dict]:
    """Candidate topics. mode: random|by_tag|recently_updated|least_linked|unused."""
    written = set()
    if exclude_written:
        for d in dr.list_drafts(_CREATION):
            for c in d.get("covers", []):
                t = idx.resolve(_INDEX, parse_link_target(c))
                if t:
                    written.add(t)
    return tp.pick_topics(_INDEX, mode, type, tag, count, frozenset(written))


@mcp.tool()
def list_columns() -> list[dict] | dict:
    """List configured content columns (创作/_栏目.yaml)."""
    return col.list_columns(_CREATION)


@mcp.tool()
def get_column(id: str) -> dict:
    """Full config for one column."""
    return col.get_column(_CREATION, id)


@mcp.tool()
def save_draft(column: str, format: str, title: str, body: str,
               covers: list[str], language: str | None = None) -> dict:
    """Save a review-ready draft under 创作/<column>/. Writes confined to 创作/."""
    return dr.save_draft(_CREATION, column, format, title, body, covers, language)


@mcp.tool()
def list_drafts(column: str | None = None, limit: int = 50) -> list[dict]:
    """List existing drafts (for dedup / review)."""
    return dr.list_drafts(_CREATION, column, limit)


@mcp.tool()
def refresh_index() -> dict:
    """Re-scan the wiki into memory."""
    global _INDEX
    _INDEX = idx.build_index(_ROOT)
    return {"pages_indexed": len(_INDEX.pages), "warnings": _INDEX.warnings}


def list_tool_names() -> list[str]:
    """Test helper: names of registered tools."""
    import anyio
    tools = anyio.run(mcp.list_tools)
    return [t.name for t in tools]


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
