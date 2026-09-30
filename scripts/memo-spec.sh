#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

[ "${1:-}" = "sync" ] || { memo_error "Usage: memo spec sync --change <change-name> --from-path <openspec-root-or-change-dir>"; exit 2; }
shift
CHANGE=""
SOURCE=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --change) CHANGE="$2"; shift 2 ;;
    --from-path) SOURCE="$2"; shift 2 ;;
    *) memo_error "Unknown spec option: $1"; exit 2 ;;
  esac
done
[ -n "$CHANGE" ] || { memo_error "spec sync requires --change"; exit 2; }
[ -n "$SOURCE" ] || { memo_error "spec sync requires --from-path"; exit 2; }
case "$CHANGE" in
  *[!a-z0-9-]*|-*|*-) memo_error "Invalid change name: $CHANGE"; exit 2 ;;
esac
[ -d "$SOURCE" ] || { memo_error "OpenSpec source path does not exist: $SOURCE"; exit 1; }
memo_validate_ready_without_remote_pull
node "$SCRIPT_DIR/memo-spec-sync.mjs" "$MEMO_VAULT" "$CHANGE" "$SOURCE"
