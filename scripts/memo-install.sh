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

install_codex() {
  dest="${CODEX_HOME:-$HOME/.codex}/skills/memo"
  mkdir -p "$dest"
  cp "$REPO_ROOT/skill/SKILL.md" "$dest/SKILL.md"
  cp "$REPO_ROOT/skill/metadata.json" "$dest/metadata.json"
  printf 'codex\n'
}

install_claude() {
  dest="${CLAUDE_HOME:-$HOME/.claude}/skills/memo"
  mkdir -p "$dest"
  cp "$REPO_ROOT/skill/SKILL.md" "$dest/SKILL.md"
  cp "$REPO_ROOT/skill/metadata.json" "$dest/metadata.json"
  printf 'claude\n'
}

install_kiro() {
  dest="${KIRO_HOME:-$HOME/.kiro}/skills/memo"
  mkdir -p "$dest"
  cp "$REPO_ROOT/skill/SKILL.md" "$dest/SKILL.md"
  cp "$REPO_ROOT/skill/metadata.json" "$dest/metadata.json"
  printf 'kiro\n'
}

install_cursor() {
  dest="${CURSOR_HOME:-$HOME/.cursor}/skills/memo"
  mkdir -p "$dest"
  cp "$REPO_ROOT/skill/SKILL.md" "$dest/SKILL.md"
  cp "$REPO_ROOT/skill/metadata.json" "$dest/metadata.json"
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
