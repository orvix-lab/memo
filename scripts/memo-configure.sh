#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

memo_load_config
[ "$MEMO_INITIALIZED" = "true" ] || { memo_error "memo is not initialized. Run memo init first."; exit 1; }

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
    --install-targets) MEMO_CONFIRMED_INSTALL_TARGETS="$2"; shift 2 ;;
    *) memo_error "Unknown config option: $1"; exit 2 ;;
  esac
done

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

memo_write_config
printf 'memo config updated\n'
