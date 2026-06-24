# dedao-vault-mcp

Local MCP server exposing the DeDao-100 wiki for content creation.

## Install & run

    cd _mcp/dedao-vault-mcp
    uv sync
    uv run pytest          # all green

## Claude Desktop wiring

Add to `claude_desktop_config.json` → `mcpServers`:

    {
      "mcpServers": {
        "dedao-vault": {
          "command": "uv",
          "args": ["run", "--directory",
                   "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools/_mcp/dedao-vault-mcp",
                   "dedao-vault-mcp"],
          "env": {
            "DEDAO_VAULT_ROOT":
              "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
          }
        }
      }
    }

Restart Claude Desktop. Tools: search_pages, get_page, get_backlinks,
get_related, pick_topics, list_columns, get_column, save_draft, list_drafts,
refresh_index. Writes are confined to `创作/`.
