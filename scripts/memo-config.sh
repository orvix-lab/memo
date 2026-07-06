#!/bin/sh

MEMO_HOME="${MEMO_HOME:-$HOME/.config/memo}"
MEMO_CONFIG="$MEMO_HOME/config"
MEMO_STATE_DIR="$MEMO_HOME/state"

memo_error() {
  printf '%s\n' "$*" >&2
}

memo_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

memo_config_value() {
  key="$1"
  file="${2:-$MEMO_CONFIG}"
  [ -f "$file" ] || return 1
  awk -F= -v key="$key" '
    $1 == key {
      value = substr($0, length(key) + 2)
      if ((substr(value, 1, 1) == "'"'"'" && substr(value, length(value), 1) == "'"'"'") ||
          (substr(value, 1, 1) == "\"" && substr(value, length(value), 1) == "\"")) {
        value = substr(value, 2, length(value) - 2)
      }
      print value
      found = 1
    }
    END { if (!found) exit 1 }
  ' "$file"
}

memo_load_config() {
  MEMO_LANGUAGE="$(memo_config_value MEMO_LANGUAGE 2>/dev/null || printf '')"
  MEMO_MODE="$(memo_config_value MEMO_MODE 2>/dev/null || printf '')"
  MEMO_VAULT="$(memo_config_value MEMO_VAULT 2>/dev/null || printf '')"
  MEMO_NOTES_DIR="$(memo_config_value MEMO_NOTES_DIR 2>/dev/null || printf 'Notes')"
  MEMO_ASSETS_DIR="$(memo_config_value MEMO_ASSETS_DIR 2>/dev/null || printf 'assets')"
  MEMO_ATTACHMENT_LAYOUT="$(memo_config_value MEMO_ATTACHMENT_LAYOUT 2>/dev/null || printf 'date-note')"
  MEMO_GIT_REMOTE="$(memo_config_value MEMO_GIT_REMOTE 2>/dev/null || printf '')"
  MEMO_GIT_BRANCH="$(memo_config_value MEMO_GIT_BRANCH 2>/dev/null || printf '')"
  MEMO_LOCAL_GIT_COMMIT="$(memo_config_value MEMO_LOCAL_GIT_COMMIT 2>/dev/null || printf 'disabled')"
  MEMO_CONFIRMED_INSTALL_TARGETS="$(memo_config_value MEMO_CONFIRMED_INSTALL_TARGETS 2>/dev/null || printf '')"
  MEMO_INITIALIZED="$(memo_config_value MEMO_INITIALIZED 2>/dev/null || printf 'false')"
}

memo_write_config() {
  mkdir -p "$MEMO_HOME"
  umask 077
  tmp="${MEMO_CONFIG}.$$"
  {
    printf 'MEMO_LANGUAGE=%s\n' "$(memo_quote "$MEMO_LANGUAGE")"
    printf 'MEMO_MODE=%s\n' "$(memo_quote "$MEMO_MODE")"
    printf 'MEMO_VAULT=%s\n' "$(memo_quote "$MEMO_VAULT")"
    printf 'MEMO_NOTES_DIR=%s\n' "$(memo_quote "$MEMO_NOTES_DIR")"
    printf 'MEMO_ASSETS_DIR=%s\n' "$(memo_quote "$MEMO_ASSETS_DIR")"
    printf 'MEMO_ATTACHMENT_LAYOUT=%s\n' "$(memo_quote "${MEMO_ATTACHMENT_LAYOUT:-date-note}")"
    printf 'MEMO_GIT_REMOTE=%s\n' "$(memo_quote "${MEMO_GIT_REMOTE:-}")"
    printf 'MEMO_GIT_BRANCH=%s\n' "$(memo_quote "${MEMO_GIT_BRANCH:-}")"
    printf 'MEMO_LOCAL_GIT_COMMIT=%s\n' "$(memo_quote "${MEMO_LOCAL_GIT_COMMIT:-disabled}")"
    printf 'MEMO_CONFIRMED_INSTALL_TARGETS=%s\n' "$(memo_quote "${MEMO_CONFIRMED_INSTALL_TARGETS:-}")"
    printf 'MEMO_INITIALIZED=%s\n' "$(memo_quote true)"
  } > "$tmp"
  mv "$tmp" "$MEMO_CONFIG"
  mkdir -p "$MEMO_STATE_DIR/sessions"
}

memo_validate_language() {
  case "$1" in
    en|zh-CN) return 0 ;;
    *) memo_error "Invalid language: $1"; return 1 ;;
  esac
}

memo_validate_mode() {
  case "$1" in
    local|remote) return 0 ;;
    *) memo_error "Invalid mode: $1"; return 1 ;;
  esac
}

memo_validate_relative_dir() {
  value="$1"
  label="$2"
  case "$value" in
    ""|/*|~*|*..*|*:*|*\\*)
      memo_error "$label must be a relative path inside the vault: $value"
      return 1
      ;;
  esac
  return 0
}

memo_validate_relative_md_path() {
  value="$1"
  label="$2"
  case "$value" in
    ""|/*|~*|*..*|*:*|*\\*|*/)
      memo_error "$label must be a vault-relative Markdown path: $value"
      return 1
      ;;
    *.md) return 0 ;;
    *)
      memo_error "$label must end with .md: $value"
      return 1
      ;;
  esac
}

memo_vault_realpath() {
  [ -d "$1" ] || return 1
  (cd "$1" 2>/dev/null && pwd -P)
}

memo_require_physical_dir_inside_vault() {
  path="$1"
  label="$2"
  real="$(memo_vault_realpath "$path")" || { memo_error "$label is not a directory: $path"; return 1; }
  case "$real" in
    "$MEMO_VAULT"|"$MEMO_VAULT"/*) return 0 ;;
    *) memo_error "$label escapes vault: $path"; return 1 ;;
  esac
}

memo_require_file_parent_inside_vault() {
  path="$1"
  label="$2"
  parent="$(dirname "$path")"
  memo_require_physical_dir_inside_vault "$parent" "$label parent" || return 1
}

memo_ensure_relative_dir_inside_vault() {
  rel="$1"
  label="$2"
  case "$rel" in
    ""|.) return 0 ;;
  esac
  memo_validate_relative_dir "$rel" "$label" || return 1

  current="$MEMO_VAULT"
  remaining="$rel"
  while [ -n "$remaining" ]; do
    component="${remaining%%/*}"
    if [ "$component" = "$remaining" ]; then
      remaining=""
    else
      remaining="${remaining#*/}"
    fi
    current="$current/$component"
    if [ -e "$current" ]; then
      memo_require_physical_dir_inside_vault "$current" "$label" || return 1
    else
      mkdir "$current" || return 1
      memo_require_physical_dir_inside_vault "$current" "$label" || return 1
    fi
  done
}

memo_validate_vault() {
  [ -n "$MEMO_VAULT" ] || { memo_error "Vault path is required."; return 1; }
  [ -d "$MEMO_VAULT" ] || { memo_error "Vault path does not exist: $MEMO_VAULT"; return 1; }
  [ -w "$MEMO_VAULT" ] || { memo_error "Vault path is not writable: $MEMO_VAULT"; return 1; }
  MEMO_VAULT="$(memo_vault_realpath "$MEMO_VAULT")" || return 1
}

memo_prepare_vault_dirs() {
  if [ "$MEMO_NOTES_DIR" != "auto" ]; then
    memo_ensure_relative_dir_inside_vault "$MEMO_NOTES_DIR" "Notes directory" || return 1
  fi
  memo_ensure_relative_dir_inside_vault "$MEMO_ASSETS_DIR" "Assets directory" || return 1
  if [ "$MEMO_NOTES_DIR" != "auto" ]; then
    [ -w "$MEMO_VAULT/$MEMO_NOTES_DIR" ] || { memo_error "Notes directory is not writable."; return 1; }
  fi
  [ -w "$MEMO_VAULT/$MEMO_ASSETS_DIR" ] || { memo_error "Assets directory is not writable."; return 1; }
}

memo_is_git_worktree() {
  git -C "$MEMO_VAULT" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

memo_validate_local_git_commit() {
  case "$MEMO_LOCAL_GIT_COMMIT" in
    enabled|disabled) ;;
    *) memo_error "Invalid local commit preference: $MEMO_LOCAL_GIT_COMMIT"; return 1 ;;
  esac
  if [ "$MEMO_LOCAL_GIT_COMMIT" = "enabled" ] && ! memo_is_git_worktree; then
    memo_error "Local commit requires the vault to be a Git worktree."
    return 1
  fi
}

memo_require_remote_git_config() {
  if ! memo_is_git_worktree; then
    memo_error "Remote mode requires the vault to be a Git worktree."
    memo_error "A normal directory created by git clone is a Git worktree; configure a Git repository and remote first."
    return 1
  fi
  [ -n "$MEMO_GIT_REMOTE" ] || MEMO_GIT_REMOTE="origin"
  [ -n "$MEMO_GIT_BRANCH" ] || MEMO_GIT_BRANCH="$(git -C "$MEMO_VAULT" branch --show-current 2>/dev/null || printf '')"
  [ -n "$MEMO_GIT_BRANCH" ] || { memo_error "Remote mode requires a current Git branch."; return 1; }
  if ! git -C "$MEMO_VAULT" remote get-url "$MEMO_GIT_REMOTE" >/dev/null 2>&1; then
    memo_error "Configured git remote is missing: $MEMO_GIT_REMOTE"
    return 1
  fi
}

memo_sync_remote_git() {
  memo_require_remote_git_config || return 1
  if ! git -C "$MEMO_VAULT" fetch "$MEMO_GIT_REMOTE"; then
    memo_error "git fetch failed for $MEMO_GIT_REMOTE. Check credentials and network access."
    return 1
  fi
  if ! git -C "$MEMO_VAULT" pull --ff-only "$MEMO_GIT_REMOTE" "$MEMO_GIT_BRANCH"; then
    memo_error "git pull --ff-only failed for $MEMO_GIT_REMOTE $MEMO_GIT_BRANCH. Resolve local changes, conflicts, or divergent history before writing."
    return 1
  fi
}

memo_validate_remote_git() {
  memo_require_remote_git_config || return 1
  if ! git -C "$MEMO_VAULT" pull --ff-only "$MEMO_GIT_REMOTE" "$MEMO_GIT_BRANCH" >/dev/null 2>&1; then
    memo_error "git pull --ff-only failed for $MEMO_GIT_REMOTE $MEMO_GIT_BRANCH. Synchronize the vault manually first."
    return 1
  fi
}

memo_validate_ready() {
  memo_load_config
  [ "$MEMO_INITIALIZED" = "true" ] || { memo_error "memo is not initialized. Run memo init first."; return 1; }
  memo_validate_language "$MEMO_LANGUAGE" || return 1
  memo_validate_mode "$MEMO_MODE" || return 1
  memo_validate_vault || return 1
  memo_prepare_vault_dirs || return 1
  case "$MEMO_MODE" in
    local) memo_validate_local_git_commit ;;
    remote) memo_validate_remote_git ;;
  esac
}

memo_validate_ready_without_remote_pull() {
  memo_load_config
  [ "$MEMO_INITIALIZED" = "true" ] || { memo_error "memo is not initialized. Run memo init first."; return 1; }
  memo_validate_language "$MEMO_LANGUAGE" || return 1
  memo_validate_mode "$MEMO_MODE" || return 1
  memo_validate_vault || return 1
  memo_prepare_vault_dirs || return 1
  case "$MEMO_MODE" in
    local) memo_validate_local_git_commit ;;
    remote) memo_require_remote_git_config ;;
  esac
}
