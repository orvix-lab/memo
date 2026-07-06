#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

SESSION_ID=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --session) SESSION_ID="$2"; shift 2 ;;
    *) memo_error "Unknown status option: $1"; exit 2 ;;
  esac
done

[ -n "$SESSION_ID" ] || { memo_error "session is required"; exit 2; }

memo_validate_ready
manifest="$MEMO_STATE_DIR/sessions/$SESSION_ID.manifest"
[ -f "$manifest" ] || { memo_error "session manifest not found: $SESSION_ID"; exit 1; }

draft_abs="$(memo_config_value DRAFT_ABS "$manifest")"
attachment_count="$(memo_config_value ATTACHMENT_COUNT "$manifest" 2>/dev/null || printf 0)"

printf 'Mode: %s\n' "$MEMO_MODE"
printf 'Session: %s\n' "$SESSION_ID"
printf 'Draft: %s\n' "$draft_abs"
printf 'Attachments: %s\n' "$attachment_count"
i=1
while [ "$i" -le "$attachment_count" ]; do
  attachment="$(memo_config_value "ATTACHMENT_ABS_$i" "$manifest" 2>/dev/null || printf '')"
  [ -z "$attachment" ] || printf 'Attachment %s: %s\n' "$i" "$attachment"
  i=$((i + 1))
done

if [ "$MEMO_MODE" = "remote" ]; then
  printf 'Git status:\n'
  git -C "$MEMO_VAULT" status --short || true
fi
