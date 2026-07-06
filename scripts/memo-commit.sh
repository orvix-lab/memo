#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

SESSION_ID=""
MESSAGE=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --session) SESSION_ID="$2"; shift 2 ;;
    --message) MESSAGE="$2"; shift 2 ;;
    *) memo_error "Unknown commit option: $1"; exit 2 ;;
  esac
done

[ -n "$SESSION_ID" ] || { memo_error "session is required"; exit 2; }
[ -n "$MESSAGE" ] || { memo_error "commit message is required"; exit 2; }

memo_validate_ready
if [ "$MEMO_MODE" = "local" ] && [ "$MEMO_LOCAL_GIT_COMMIT" != "enabled" ]; then
  memo_error "Local commit is disabled."
  exit 1
fi

manifest="$MEMO_STATE_DIR/sessions/$SESSION_ID.manifest"
[ -f "$manifest" ] || { memo_error "session manifest not found: $SESSION_ID"; exit 1; }
draft_abs="$(memo_config_value DRAFT_ABS "$manifest")"
attachment_count="$(memo_config_value ATTACHMENT_COUNT "$manifest" 2>/dev/null || printf 0)"

case "$draft_abs" in
  "$MEMO_VAULT"/*) ;;
  *) memo_error "draft path escapes vault"; exit 1 ;;
esac

git -C "$MEMO_VAULT" add "$draft_abs"
i=1
while [ "$i" -le "$attachment_count" ]; do
  attachment="$(memo_config_value "ATTACHMENT_ABS_$i" "$manifest" 2>/dev/null || printf '')"
  if [ -n "$attachment" ]; then
    case "$attachment" in
      "$MEMO_VAULT"/*) git -C "$MEMO_VAULT" add "$attachment" ;;
      *) memo_error "attachment path escapes vault"; exit 1 ;;
    esac
  fi
  i=$((i + 1))
done

git -C "$MEMO_VAULT" commit -m "$MESSAGE"
tmp="${manifest}.$$"
awk '
  /^ARCHIVED=/ { print "ARCHIVED='\''true'\''"; next }
  { print }
' "$manifest" > "$tmp"
mv "$tmp" "$manifest"
printf 'Committed session: %s\n' "$SESSION_ID"
