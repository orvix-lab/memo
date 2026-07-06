#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

SESSION_ID=""
TITLE=""
CONTENT_FILE=""
ATTACHMENTS=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --session) SESSION_ID="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --content-file) CONTENT_FILE="$2"; shift 2 ;;
    --attachment)
      ATTACHMENTS="${ATTACHMENTS}${ATTACHMENTS:+
}$2"
      shift 2
      ;;
    *) memo_error "Unknown write option: $1"; exit 2 ;;
  esac
done

[ -n "$TITLE" ] || { memo_error "title is required"; exit 2; }
[ -n "$CONTENT_FILE" ] || { memo_error "content file is required"; exit 2; }
[ -f "$CONTENT_FILE" ] || { memo_error "content file is missing: $CONTENT_FILE"; exit 1; }
[ -s "$CONTENT_FILE" ] || { memo_error "content is empty"; exit 1; }

memo_validate_ready

case "$SESSION_ID" in
  "") SESSION_ID="$(date +%Y%m%d%H%M%S)-$$" ;;
  *[!A-Za-z0-9_-]*) memo_error "session id may only contain letters, numbers, underscore, and hyphen"; exit 2 ;;
esac

slug="$(printf '%s' "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9][^a-z0-9]*/-/g; s/^-//; s/-$//')"
[ -n "$slug" ] || slug="note"
today="$(date +%Y-%m-%d)"
year="$(date +%Y)"
month="$(date +%m)"
manifest="$MEMO_STATE_DIR/sessions/$SESSION_ID.manifest"

if [ -f "$manifest" ]; then
  draft_abs="$(memo_config_value DRAFT_ABS "$manifest")"
  draft_rel="$(memo_config_value DRAFT_REL "$manifest")"
else
  base="$today-$slug.md"
  draft_abs="$MEMO_VAULT/$MEMO_NOTES_DIR/$base"
  draft_rel="$MEMO_NOTES_DIR/$base"
  n=2
  while [ -e "$draft_abs" ]; do
    base="$today-$slug-$n.md"
    draft_abs="$MEMO_VAULT/$MEMO_NOTES_DIR/$base"
    draft_rel="$MEMO_NOTES_DIR/$base"
    n=$((n + 1))
  done
fi

case "$draft_abs" in
  "$MEMO_VAULT"/*) ;;
  *) memo_error "draft path escapes vault"; exit 1 ;;
esac

attachment_count=0
attachment_abs_lines=""
attachment_rel_lines=""
link_file="$(mktemp)"
cleanup_files="$link_file"

notes_depth="$(printf '%s' "$MEMO_NOTES_DIR" | awk -F/ '{ print NF }')"
rel_prefix=""
i=1
while [ "$i" -le "$notes_depth" ]; do
  rel_prefix="../$rel_prefix"
  i=$((i + 1))
done

if [ -n "$ATTACHMENTS" ]; then
  asset_dir="$MEMO_VAULT/$MEMO_ASSETS_DIR/$year/$month/$slug"
  mkdir -p "$asset_dir"
  printf '%s\n' "$ATTACHMENTS" | while IFS= read -r attachment; do
    [ -n "$attachment" ] || continue
    [ -r "$attachment" ] || { memo_error "attachment is not readable: $attachment"; exit 1; }
  done
  index=1
  printf '%s\n' "$ATTACHMENTS" | while IFS= read -r attachment; do
    [ -n "$attachment" ] || continue
    ext="${attachment##*.}"
    [ "$ext" != "$attachment" ] || ext="bin"
    dest="$asset_dir/image-$index.$ext"
    rel="$MEMO_ASSETS_DIR/$year/$month/$slug/image-$index.$ext"
    case "$dest" in
      "$MEMO_VAULT"/*) ;;
      *) memo_error "attachment path escapes vault"; exit 1 ;;
    esac
    cp "$attachment" "$dest"
    printf '![image-%s](%s%s)\n' "$index" "$rel_prefix" "$rel" >> "$link_file"
    printf '%s\n' "$dest" >> "$link_file.abs"
    printf '%s\n' "$rel" >> "$link_file.rel"
    index=$((index + 1))
  done
fi

tmp_note="${draft_abs}.$$"
cp "$CONTENT_FILE" "$tmp_note"
if [ -s "$link_file" ]; then
  printf '\n' >> "$tmp_note"
  cat "$link_file" >> "$tmp_note"
fi
mv "$tmp_note" "$draft_abs"

if [ -f "$link_file.abs" ]; then
  attachment_count="$(wc -l < "$link_file.abs" | tr -d ' ')"
  attachment_abs_lines="$(cat "$link_file.abs")"
  attachment_rel_lines="$(cat "$link_file.rel")"
fi

mkdir -p "$MEMO_STATE_DIR/sessions"
tmp_manifest="${manifest}.$$"
{
  printf 'SESSION_ID=%s\n' "$(memo_quote "$SESSION_ID")"
  printf 'MODE=%s\n' "$(memo_quote "$MEMO_MODE")"
  printf 'DRAFT_ABS=%s\n' "$(memo_quote "$draft_abs")"
  printf 'DRAFT_REL=%s\n' "$(memo_quote "$draft_rel")"
  printf 'ATTACHMENT_COUNT=%s\n' "$(memo_quote "$attachment_count")"
  idx=1
  if [ -n "$attachment_abs_lines" ]; then
    printf '%s\n' "$attachment_abs_lines" | while IFS= read -r item; do
      printf 'ATTACHMENT_ABS_%s=%s\n' "$idx" "$(memo_quote "$item")"
      idx=$((idx + 1))
    done
  fi
  idx=1
  if [ -n "$attachment_rel_lines" ]; then
    printf '%s\n' "$attachment_rel_lines" | while IFS= read -r item; do
      printf 'ATTACHMENT_REL_%s=%s\n' "$idx" "$(memo_quote "$item")"
      idx=$((idx + 1))
    done
  fi
  printf 'ARCHIVED=%s\n' "$(memo_quote false)"
  printf 'ABANDONED=%s\n' "$(memo_quote false)"
  printf 'CREATED_AT=%s\n' "$(memo_quote "$(date -u +%Y-%m-%dT%H:%M:%SZ)")"
} > "$tmp_manifest"
mv "$tmp_manifest" "$manifest"

rm -f "$link_file" "$link_file.abs" "$link_file.rel"

printf 'Session: %s\n' "$SESSION_ID"
printf 'Draft: %s\n' "$draft_abs"
if [ "$attachment_count" != "0" ]; then
  printf 'Attachments: %s\n' "$attachment_count"
fi
