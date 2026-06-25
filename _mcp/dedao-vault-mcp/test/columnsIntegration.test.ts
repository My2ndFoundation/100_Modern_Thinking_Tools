// test/columnsIntegration.test.ts
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { resolveRoot, CREATION_FOLDER } from "../src/config";
import { buildIndex } from "../src/vaultIndex";
import { loadColumns } from "../src/columns";
import { pickTopics } from "../src/topics";

// Guards against tag/type drift: each shipped column's topic_filter must
// match >=1 page in the real vault.
describe("real columns", () => {
  it("each column yields candidates", () => {
    let root: string;
    try {
      root = resolveRoot();
    } catch {
      return; // no real vault root — skip
    }
    const cols = loadColumns(path.join(root, CREATION_FOLDER));
    if (!Array.isArray(cols)) return; // no real _栏目.yaml — skip
    const idx = buildIndex(root);
    for (const col of cols) {
      const tf = col.topic_filter ?? {};
      const got = pickTopics(idx, "unused", tf.type, tf.tag, 5);
      expect(got.length, `column ${col.id} filter ${JSON.stringify(tf)} yields none`).toBeGreaterThan(0);
    }
  });
});
