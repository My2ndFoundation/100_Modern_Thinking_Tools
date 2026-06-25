# dedao-vault-mcp (TypeScript)

Local MCP server exposing the DeDao-100 wiki for content creation. Runtime: bun.

## Prerequisites

[bun](https://bun.sh) must be installed: `curl -fsSL https://bun.sh/install | bash`.

## Install & test

```bash
cd _mcp/dedao-vault-mcp
bun install
bunx vitest run        # all green
bunx tsc --noEmit      # typecheck
```

## Claude Desktop wiring

Add to `claude_desktop_config.json` → `mcpServers` (bun runs the .ts entry directly — no build step):

```json
{
  "mcpServers": {
    "dedao-vault": {
      "command": "bun",
      "args": [
        "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools/_mcp/dedao-vault-mcp/src/server.ts"
      ],
      "env": {
        "DEDAO_VAULT_ROOT": "/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
      }
    }
  }
}
```

Restart Claude Desktop. Tools: search_pages, get_page, get_backlinks, get_related,
pick_topics, list_columns, get_column, save_draft, list_drafts, refresh_index.
Writes are confined to `创作/`.
