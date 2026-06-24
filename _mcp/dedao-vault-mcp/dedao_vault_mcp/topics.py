import random

from .index import VaultIndex
from .pages import one_liner

VALID_MODES = {"random", "by_tag", "recently_updated", "least_linked", "unused"}


def pick_topics(index: VaultIndex, mode: str, type=None, tag=None,
                count: int = 5, written_covers=frozenset()):
    if mode not in VALID_MODES:
        raise ValueError(f"unknown mode: {mode}")
    cand = [
        p for p in index.pages.values()
        if (not type or p.type == type)
        and (not tag or tag in p.tags)
        and p.name not in written_covers
    ]
    if mode == "recently_updated":
        cand.sort(key=lambda p: str(p.frontmatter.get("updated", "")), reverse=True)
    elif mode == "least_linked":
        cand.sort(key=lambda p: (len(index.backlinks.get(p.name, set())), p.name))
    elif mode == "random":
        random.shuffle(cand)
    else:  # by_tag, unused
        cand.sort(key=lambda p: p.name)

    def why(p):
        if mode == "least_linked":
            return f"backlinks={len(index.backlinks.get(p.name, set()))}"
        if mode == "recently_updated":
            return f"updated={p.frontmatter.get('updated', '')}"
        return mode

    return [
        {"name": p.name, "type": p.type,
         "one_liner": one_liner(p.sections), "why": why(p)}
        for p in cand[:count]
    ]
