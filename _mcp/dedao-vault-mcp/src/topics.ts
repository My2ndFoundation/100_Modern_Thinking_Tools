import { VaultIndex } from "./vaultIndex";
import { Page, oneLiner } from "./pages";

export const VALID_MODES = new Set([
  "random", "by_tag", "recently_updated", "least_linked", "unused",
]);

function byName(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function pickTopics(
  index: VaultIndex,
  mode: string,
  type?: string,
  tag?: string,
  count = 5,
  writtenCovers: Set<string> = new Set(),
) {
  if (!VALID_MODES.has(mode)) throw new Error(`unknown mode: ${mode}`);
  const cand: Page[] = [];
  for (const p of index.pages.values()) {
    if (type && p.type !== type) continue;
    if (tag && !p.tags.includes(tag)) continue;
    if (writtenCovers.has(p.name)) continue;
    cand.push(p);
  }
  if (mode === "recently_updated") {
    cand.sort((a, b) => {
      const av = String(a.frontmatter.updated ?? "");
      const bv = String(b.frontmatter.updated ?? "");
      return av < bv ? 1 : av > bv ? -1 : 0;
    });
  } else if (mode === "least_linked") {
    const bc = (p: Page) => index.backlinks.get(p.name)?.size ?? 0;
    cand.sort((a, b) => bc(a) - bc(b) || byName(a.name, b.name));
  } else if (mode === "random") {
    for (let i = cand.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cand[i], cand[j]] = [cand[j], cand[i]];
    }
  } else {
    cand.sort((a, b) => byName(a.name, b.name));
  }
  const why = (p: Page) => {
    if (mode === "least_linked") return `backlinks=${index.backlinks.get(p.name)?.size ?? 0}`;
    if (mode === "recently_updated") return `updated=${p.frontmatter.updated ?? ""}`;
    return mode;
  };
  return cand.slice(0, count).map((p) => ({
    name: p.name, type: p.type, one_liner: oneLiner(p.sections), why: why(p),
  }));
}
