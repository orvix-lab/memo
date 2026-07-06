#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

MEMO_LANGUAGE=""
MEMO_MODE=""
MEMO_VAULT=""
MEMO_NOTES_DIR="Notes"
MEMO_ASSETS_DIR="assets"
MEMO_ATTACHMENT_LAYOUT="date-note"
MEMO_GIT_REMOTE=""
MEMO_GIT_BRANCH=""
MEMO_LOCAL_GIT_COMMIT="disabled"
MEMO_CONFIRMED_INSTALL_TARGETS=""
INSTALL_TARGET=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --language) MEMO_LANGUAGE="$2"; shift 2 ;;
    --mode) MEMO_MODE="$2"; shift 2 ;;
    --vault) MEMO_VAULT="$2"; shift 2 ;;
    --notes-dir) MEMO_NOTES_DIR="$2"; shift 2 ;;
    --assets-dir) MEMO_ASSETS_DIR="$2"; shift 2 ;;
    --remote) MEMO_GIT_REMOTE="$2"; shift 2 ;;
    --branch) MEMO_GIT_BRANCH="$2"; shift 2 ;;
    --local-git-commit) MEMO_LOCAL_GIT_COMMIT="$2"; shift 2 ;;
    --install-target) INSTALL_TARGET="$2"; shift 2 ;;
    *) memo_error "Unknown init option: $1"; exit 2 ;;
  esac
done

[ -n "$MEMO_LANGUAGE" ] || MEMO_LANGUAGE="en"
[ -n "$MEMO_MODE" ] || MEMO_MODE="local"

memo_validate_language "$MEMO_LANGUAGE"
memo_validate_mode "$MEMO_MODE"
memo_validate_vault
memo_prepare_vault_dirs

case "$MEMO_MODE" in
  local)
    MEMO_GIT_REMOTE=""
    MEMO_GIT_BRANCH=""
    memo_validate_local_git_commit
    ;;
  remote)
    [ -n "$MEMO_GIT_REMOTE" ] || MEMO_GIT_REMOTE="origin"
    memo_validate_remote_git
    MEMO_LOCAL_GIT_COMMIT="disabled"
    ;;
esac

case "$INSTALL_TARGET" in
  ""|skip|codex|claude) ;;
  *) memo_error "Invalid install target: $INSTALL_TARGET"; exit 2 ;;
esac

memo_write_config

case "$INSTALL_TARGET" in
  ""|skip) ;;
  codex|claude)
    "$SCRIPT_DIR/memo-install.sh" --target "$INSTALL_TARGET" >/dev/null
    ;;
esac

printf 'memo initialized: %s\n' "$MEMO_CONFIG"
