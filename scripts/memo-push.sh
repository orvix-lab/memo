#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

memo_validate_ready
[ "$MEMO_MODE" = "remote" ] || { memo_error "push is only available in remote mode"; exit 1; }

git -C "$MEMO_VAULT" push "$MEMO_GIT_REMOTE" "$MEMO_GIT_BRANCH"
