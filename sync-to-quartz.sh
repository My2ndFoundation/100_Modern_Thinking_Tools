#!/usr/bin/env bash
set -euo pipefail

SRC="/Users/nickma/Develop/My2ndBrain/DeDao-100 Modern Thinking Tools"
DST="/Users/nickma/Develop/My2ndBrain/quartz/content"

ITEMS=(
  "assets"
  "index.md"
  "人物"
  "工具"
  "来源"
  "概念"
  "著作"
)

if [[ ! -d "$DST" ]]; then
  echo "error: destination does not exist: $DST" >&2
  exit 1
fi

for item in "${ITEMS[@]}"; do
  src_path="$SRC/$item"
  if [[ ! -e "$src_path" ]]; then
    echo "warn: missing source, skipping: $item" >&2
    continue
  fi

  if [[ -d "$src_path" ]]; then
    rsync -a --delete "$src_path/" "$DST/$item/"
  else
    rsync -a "$src_path" "$DST/$item"
  fi
  echo "synced: $item"
done

echo "done → $DST"
