# 创作 / Drafts

LLM-generated, review-ready drafts. **Not published to Quartz** (not in the
sync list). Layout:

- `_栏目.yaml` — column configs (audience, voice, platform, format, language,
  topic mode). Edit to add/adjust columns.
- `_prompts/<column>.md` — ready-to-paste Claude Desktop task prompts.
- `<column>/YYYY-MM-DD-<slug>.md` — saved drafts (`status: pending-review`).

Workflow: paste a `_prompts/<column>.md` into a Claude Desktop task, trigger it
manually (add `Topic: …` or `Hotspot: …` when relevant), review the draft in
Obsidian, then publish by hand.
