#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
. "$SCRIPT_DIR/memo-config.sh"

memo_load_config
[ "$MEMO_INITIALIZED" = "true" ] || { memo_error "memo is not initialized. Run memo init first."; exit 1; }

if [ "$MEMO_LANGUAGE" = "zh-CN" ]; then
  printf '语言: %s\n' "$MEMO_LANGUAGE"
  printf '模式: %s\n' "$MEMO_MODE"
  printf 'Vault: %s\n' "$MEMO_VAULT"
  printf '笔记目录: %s\n' "$MEMO_NOTES_DIR"
  printf '附件目录: %s\n' "$MEMO_ASSETS_DIR"
  printf '安装目标: %s\n' "${MEMO_CONFIRMED_INSTALL_TARGETS:-none}"
else
  printf 'Language: %s\n' "$MEMO_LANGUAGE"
  printf 'Mode: %s\n' "$MEMO_MODE"
  printf 'Vault: %s\n' "$MEMO_VAULT"
  printf 'Notes directory: %s\n' "$MEMO_NOTES_DIR"
  printf 'Assets directory: %s\n' "$MEMO_ASSETS_DIR"
  printf 'Install targets: %s\n' "${MEMO_CONFIRMED_INSTALL_TARGETS:-none}"
fi

case "$MEMO_MODE" in
  local)
    if [ "$MEMO_LANGUAGE" = "zh-CN" ]; then
      printf '本地提交: %s\n' "$MEMO_LOCAL_GIT_COMMIT"
      printf '远端同步: disabled\n'
    else
      printf 'Local commit: %s\n' "$MEMO_LOCAL_GIT_COMMIT"
      printf 'Remote sync: disabled\n'
    fi
    ;;
  remote)
    if [ "$MEMO_LANGUAGE" = "zh-CN" ]; then
      printf 'Git remote: %s\n' "$MEMO_GIT_REMOTE"
      printf 'Git branch: %s\n' "$MEMO_GIT_BRANCH"
    else
      printf 'Git remote: %s\n' "$MEMO_GIT_REMOTE"
      printf 'Git branch: %s\n' "$MEMO_GIT_BRANCH"
    fi
    ;;
esac
