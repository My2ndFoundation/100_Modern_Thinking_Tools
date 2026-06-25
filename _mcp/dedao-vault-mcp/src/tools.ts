// src/tools.ts
import { z, type ZodRawShape } from "zod";
import {
  VaultIndex, search, pageView, backlinksView, relatedView, resolve,
} from "./vaultIndex";
import { pickTopics } from "./topics";
import { listColumns, getColumn } from "./columns";
import { saveDraft, listDrafts } from "./drafts";
import { parseLinkTarget } from "./pages";

export interface Ctx {
  root: string;
  creation: string;
  state: { index: VaultIndex };
  refresh(): void;
}

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  handler: (args: any) => any | Promise<any>;
}

export function makeTools(ctx: Ctx): ToolDef[] {
  const idx = () => ctx.state.index;
  return [
    {
      name: "search_pages",
      title: "Search pages",
      description: "Keyword/alias search over the wiki, ranked by hit location.",
      inputSchema: { query: z.string(), type: z.string().optional(), tag: z.string().optional(), limit: z.number().optional() },
      handler: ({ query, type, tag, limit }) => search(idx(), query, type, tag, limit ?? 20),
    },
    {
      name: "get_page",
      title: "Get page",
      description: "Full page: frontmatter + sections + resolved outlinks. Resolves aliases.",
      inputSchema: { name: z.string() },
      handler: ({ name }) => pageView(idx(), name),
    },
    {
      name: "get_backlinks",
      title: "Get backlinks",
      description: "Pages that link to this page.",
      inputSchema: { name: z.string() },
      handler: ({ name }) => backlinksView(idx(), name),
    },
    {
      name: "get_related",
      title: "Get related",
      description: "Related pages via 相关工具/相关概念 sections and shared sources.",
      inputSchema: { name: z.string() },
      handler: ({ name }) => relatedView(idx(), name),
    },
    {
      name: "pick_topics",
      title: "Pick topics",
      description: "Candidate topics. mode: random|by_tag|recently_updated|least_linked|unused.",
      inputSchema: { mode: z.string(), type: z.string().optional(), tag: z.string().optional(), count: z.number().optional(), exclude_written: z.boolean().optional() },
      handler: ({ mode, type, tag, count, exclude_written }) => {
        const written = new Set<string>();
        if (exclude_written ?? true) {
          for (const d of listDrafts(ctx.creation)) {
            for (const c of (d.covers ?? [])) {
              const t = resolve(idx(), parseLinkTarget(c));
              if (t) written.add(t);
            }
          }
        }
        return pickTopics(idx(), mode, type, tag, count ?? 5, written);
      },
    },
    {
      name: "list_columns",
      title: "List columns",
      description: "List configured content columns (创作/_栏目.yaml).",
      inputSchema: {},
      handler: () => listColumns(ctx.creation),
    },
    {
      name: "get_column",
      title: "Get column",
      description: "Full config for one column.",
      inputSchema: { id: z.string() },
      handler: ({ id }) => getColumn(ctx.creation, id),
    },
    {
      name: "save_draft",
      title: "Save draft",
      description: "Save a review-ready draft under 创作/<column>/. Writes confined to 创作/.",
      inputSchema: { column: z.string(), format: z.string(), title: z.string(), body: z.string(), covers: z.array(z.string()), language: z.string().optional() },
      handler: ({ column, format, title, body, covers, language }) =>
        saveDraft(ctx.creation, column, format, title, body, covers, language),
    },
    {
      name: "list_drafts",
      title: "List drafts",
      description: "List existing drafts (for dedup / review).",
      inputSchema: { column: z.string().optional(), limit: z.number().optional() },
      handler: ({ column, limit }) => listDrafts(ctx.creation, column, limit ?? 50),
    },
    {
      name: "refresh_index",
      title: "Refresh index",
      description: "Re-scan the wiki into memory.",
      inputSchema: {},
      handler: () => {
        ctx.refresh();
        return { pages_indexed: idx().pages.size, warnings: idx().warnings };
      },
    },
  ];
}
