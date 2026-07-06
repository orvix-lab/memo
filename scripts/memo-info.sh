#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

memo_load_config
[ "$MEMO_INITIALIZED" = "true" ] || { memo_error "memo is not initialized. Run memo init first."; exit 1; }

printf 'Language: %s\n' "$MEMO_LANGUAGE"
printf 'Mode: %s\n' "$MEMO_MODE"
printf 'Vault: %s\n' "$MEMO_VAULT"
printf 'Notes directory: %s\n' "$MEMO_NOTES_DIR"
printf 'Assets directory: %s\n' "$MEMO_ASSETS_DIR"
printf 'Install targets: %s\n' "${MEMO_CONFIRMED_INSTALL_TARGETS:-none}"

case "$MEMO_MODE" in
  local)
    printf 'Local commit: %s\n' "$MEMO_LOCAL_GIT_COMMIT"
    printf 'Remote sync: disabled\n'
    ;;
  remote)
    printf 'Git remote: %s\n' "$MEMO_GIT_REMOTE"
    printf 'Git branch: %s\n' "$MEMO_GIT_BRANCH"
    ;;
esac
