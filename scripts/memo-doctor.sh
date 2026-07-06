#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

QUIET="false"
if [ "${1:-}" = "--quiet" ]; then
  QUIET="true"
fi

memo_validate_ready

if [ "$QUIET" != "true" ]; then
  printf 'memo ready\n'
  printf 'Vault: %s\n' "$MEMO_VAULT"
  printf 'Mode: %s\n' "$MEMO_MODE"
fi
