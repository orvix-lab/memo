#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

SESSION_ID=""
TITLE=""
TARGET_PATH=""
CONTENT_FILE=""
ATTACHMENTS=""
ABANDON="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --abandon) ABANDON="true"; shift ;;
    --session) SESSION_ID="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --path) TARGET_PATH="$2"; shift 2 ;;
    --content-file) CONTENT_FILE="$2"; shift 2 ;;
    --attachment)
      ATTACHMENTS="${ATTACHMENTS}${ATTACHMENTS:+
}$2"
      shift 2
      ;;
    *) memo_error "Unknown write option: $1"; exit 2 ;;
  esac
done

if [ "$ABANDON" = "true" ]; then
  [ -n "$SESSION_ID" ] || { memo_error "session is required"; exit 2; }
  memo_load_config
  [ "$MEMO_INITIALIZED" = "true" ] || { memo_error "memo is not initialized. Run memo init first."; exit 1; }
  memo_validate_vault
  manifest="$MEMO_STATE_DIR/sessions/$SESSION_ID.manifest"
  [ -f "$manifest" ] || { memo_error "session manifest not found: $SESSION_ID"; exit 1; }
  draft_abs="$(memo_config_value DRAFT_ABS "$manifest")"
  memo_require_file_parent_inside_vault "$draft_abs" "draft" || exit 1
  case "$draft_abs" in
    "$MEMO_VAULT"/*) [ ! -e "$draft_abs" ] || rm -f "$draft_abs" ;;
    *) memo_error "draft path escapes vault"; exit 1 ;;
  esac
  attachment_count="$(memo_config_value ATTACHMENT_COUNT "$manifest" 2>/dev/null || printf 0)"
  i=1
  while [ "$i" -le "$attachment_count" ]; do
    attachment="$(memo_config_value "ATTACHMENT_ABS_$i" "$manifest" 2>/dev/null || printf '')"
    if [ -n "$attachment" ]; then
      case "$attachment" in
        "$MEMO_VAULT"/*)
          memo_require_file_parent_inside_vault "$attachment" "attachment" || exit 1
          [ ! -e "$attachment" ] || rm -f "$attachment"
          ;;
        *) memo_error "attachment path escapes vault"; exit 1 ;;
      esac
    fi
    i=$((i + 1))
  done
  tmp="${manifest}.$$"
  awk '
    /^ABANDONED=/ { print "ABANDONED='\''true'\''"; next }
    { print }
  ' "$manifest" > "$tmp"
  mv "$tmp" "$manifest"
  printf 'Abandoned session: %s\n' "$SESSION_ID"
  exit 0
fi

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
  if [ -n "$TARGET_PATH" ]; then
    memo_validate_relative_md_path "$TARGET_PATH" "draft path" || exit 1
    draft_rel="$TARGET_PATH"
    draft_abs="$MEMO_VAULT/$draft_rel"
  elif [ "$MEMO_NOTES_DIR" = "auto" ]; then
    memo_error "memo write requires --path <vault-relative.md> when notes directory is auto"
    exit 2
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
fi

case "$draft_abs" in
  "$MEMO_VAULT"/*) ;;
  *) memo_error "draft path escapes vault"; exit 1 ;;
esac
draft_parent_rel="$(dirname "$draft_rel")"
memo_ensure_relative_dir_inside_vault "$draft_parent_rel" "draft directory" || exit 1
memo_require_file_parent_inside_vault "$draft_abs" "draft" || exit 1

attachment_count=0
attachment_abs_lines=""
attachment_rel_lines=""
link_file="$(mktemp)"
combined_abs="$(mktemp)"
combined_rel="$(mktemp)"

draft_dir="$(dirname "$draft_rel")"
if [ "$draft_dir" = "." ]; then
  notes_depth=0
else
  notes_depth="$(printf '%s' "$draft_dir" | awk -F/ '{ print NF }')"
fi
rel_prefix=""
i=1
while [ "$i" -le "$notes_depth" ]; do
  rel_prefix="../$rel_prefix"
  i=$((i + 1))
done

if [ -n "$ATTACHMENTS" ]; then
  asset_rel_dir="$MEMO_ASSETS_DIR/$year/$month/$slug"
  memo_ensure_relative_dir_inside_vault "$asset_rel_dir" "Asset directory" || exit 1
  asset_dir="$MEMO_VAULT/$asset_rel_dir"
  memo_require_physical_dir_inside_vault "$asset_dir" "Asset directory" || exit 1
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
    memo_require_file_parent_inside_vault "$dest" "attachment" || exit 1
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

if [ -f "$manifest" ]; then
  old_count="$(memo_config_value ATTACHMENT_COUNT "$manifest" 2>/dev/null || printf 0)"
  i=1
  while [ "$i" -le "$old_count" ]; do
    old_abs="$(memo_config_value "ATTACHMENT_ABS_$i" "$manifest" 2>/dev/null || printf '')"
    old_rel="$(memo_config_value "ATTACHMENT_REL_$i" "$manifest" 2>/dev/null || printf '')"
    if [ -n "$old_abs" ] && ! grep -Fqx "$old_abs" "$combined_abs"; then
      printf '%s\n' "$old_abs" >> "$combined_abs"
      printf '%s\n' "$old_rel" >> "$combined_rel"
    fi
    i=$((i + 1))
  done
fi

if [ -f "$link_file.abs" ]; then
  paste "$link_file.abs" "$link_file.rel" | while IFS="$(printf '\t')" read -r new_abs new_rel; do
    if [ -n "$new_abs" ] && ! grep -Fqx "$new_abs" "$combined_abs"; then
      printf '%s\n' "$new_abs" >> "$combined_abs"
      printf '%s\n' "$new_rel" >> "$combined_rel"
    fi
  done
fi

if [ -s "$combined_abs" ]; then
  attachment_count="$(wc -l < "$combined_abs" | tr -d ' ')"
  attachment_abs_lines="$(cat "$combined_abs")"
  attachment_rel_lines="$(cat "$combined_rel")"
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

rm -f "$link_file" "$link_file.abs" "$link_file.rel" "$combined_abs" "$combined_rel"

printf 'Session: %s\n' "$SESSION_ID"
printf 'Draft: %s\n' "$draft_abs"
if [ "$attachment_count" != "0" ]; then
  printf 'Attachments: %s\n' "$attachment_count"
fi
