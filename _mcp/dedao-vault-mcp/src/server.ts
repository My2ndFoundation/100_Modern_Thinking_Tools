// src/server.ts
import * as path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveRoot, CREATION_FOLDER } from "./config";
import { buildIndex } from "./vaultIndex";
import { makeTools, type Ctx } from "./tools";

export function createContext(): Ctx {
  const root = resolveRoot();
  const creation = path.join(root, CREATION_FOLDER);
  const state = { index: buildIndex(root) };
  return {
    root,
    creation,
    state,
    refresh() {
      state.index = buildIndex(root);
    },
  };
}

export function createServer(ctx: Ctx): McpServer {
  const server = new McpServer({ name: "dedao-vault", version: "0.1.0" });
  for (const def of makeTools(ctx)) {
    server.tool(def.name, def.description, def.inputSchema, async (args: any) => {
      const result = await def.handler(args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    });
  }
  return server;
}

export async function main(): Promise<void> {
  const server = createServer(createContext());
  await server.connect(new StdioServerTransport());
}

// Run only when executed directly (bun sets import.meta.main), not when imported by tests.
if ((import.meta as any).main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
