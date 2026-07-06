#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

memo_load_config
[ "$MEMO_INITIALIZED" = "true" ] || { memo_error "memo is not initialized. Run memo init first."; exit 1; }
memo_validate_language "$MEMO_LANGUAGE"
memo_validate_mode "$MEMO_MODE"
[ "$MEMO_MODE" = "remote" ] || { memo_error "memo sync is only available in remote mode."; exit 1; }
memo_validate_vault
memo_prepare_vault_dirs
memo_sync_remote_git

printf 'memo synced: %s %s\n' "$MEMO_GIT_REMOTE" "$MEMO_GIT_BRANCH"
