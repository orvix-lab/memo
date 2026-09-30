#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

TARGET=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    *) memo_error "Unknown install option: $1"; exit 2 ;;
  esac
done

[ -n "$TARGET" ] || { memo_error "Install target is required."; exit 2; }

install_skill_pair() {
  home="$1"
  dest="$home/skills/memo"
  organize_dest="$home/skills/memo-organize"
  spec_dest="$home/skills/memo-spec-sync"
  sync_dest="$home/skills/memo-sync"
  mkdir -p "$dest" "$organize_dest" "$spec_dest" "$sync_dest"
  cp "$REPO_ROOT/skill/SKILL.md" "$dest/SKILL.md"
  cp "$REPO_ROOT/skill/metadata.json" "$dest/metadata.json"
  cp "$REPO_ROOT/skill/memo-organize/SKILL.md" "$organize_dest/SKILL.md"
  cp "$REPO_ROOT/skill/memo-organize/metadata.json" "$organize_dest/metadata.json"
  cp "$REPO_ROOT/skill/memo-spec-sync/SKILL.md" "$spec_dest/SKILL.md"
  cp "$REPO_ROOT/skill/memo-spec-sync/metadata.json" "$spec_dest/metadata.json"
  cp "$REPO_ROOT/skill/memo-sync/SKILL.md" "$sync_dest/SKILL.md"
  cp "$REPO_ROOT/skill/memo-sync/metadata.json" "$sync_dest/metadata.json"
}

install_codex() {
  install_skill_pair "${CODEX_HOME:-$HOME/.codex}"
  printf 'codex\n'
}

install_claude() {
  install_skill_pair "${CLAUDE_HOME:-$HOME/.claude}"
  printf 'claude\n'
}

install_kiro() {
  install_skill_pair "${KIRO_HOME:-$HOME/.kiro}"
  printf 'kiro\n'
}

install_cursor() {
  install_skill_pair "${CURSOR_HOME:-$HOME/.cursor}"
  printf 'cursor\n'
}

installed=""
case "$TARGET" in
  codex) installed="$(install_codex)" ;;
  claude) installed="$(install_claude)" ;;
  kiro) installed="$(install_kiro)" ;;
  cursor) installed="$(install_cursor)" ;;
  all)
    installed="$(install_codex),$(install_claude),$(install_kiro),$(install_cursor)"
    ;;
  *) memo_error "Invalid install target: $TARGET"; exit 2 ;;
esac

if [ -f "$MEMO_CONFIG" ]; then
  memo_load_config
  MEMO_CONFIRMED_INSTALL_TARGETS="$installed"
  memo_write_config
fi

printf 'Installed memo skill: %s\n' "$installed"
