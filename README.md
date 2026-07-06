# Memo

[中文文档](./README.zh-CN.md)

Memo is a CLI and AI skill for archiving AI-generated notes, research, decisions, and attachments into a configured Obsidian vault.

It is designed for AI coding tools such as Codex and Claude Code. The AI writes through the `memo` CLI instead of directly touching your vault, so notes are stored with predictable safety checks, session tracking, optional Git sync, and a confirmation gate before commit or push.

## What Memo Is For

- Save AI-generated summaries, research notes, plans, decisions, and reference material into Obsidian.
- Let the AI choose the most appropriate folder when notes directory is set to `auto`.
- Keep note drafts editable before final confirmation.
- Archive images or other attachments alongside the note.
- Support local-only vaults and Git-backed remote vaults.

## Features

- **AI-first writing flow**: install the `memo` skill into Codex or Claude Code and invoke `$memo`.
- **Obsidian-friendly Markdown**: notes can include YAML frontmatter such as `title`, `created`, `tags`, and `status`.
- **Auto note placement**: configure notes directory as `auto`, then the AI chooses a vault-relative `.md` path based on note content.
- **Session-based drafts**: repeated writes in the same session update the same draft instead of creating duplicates.
- **Attachment handling**: image attachments are copied into the configured assets directory and linked from the note.
- **Local and remote modes**:
  - `local`: write to a local vault without pull or push.
  - `remote`: sync with Git before writing, then commit and push only after explicit user confirmation.
- **Controlled Git sync**: `memo sync` performs `git fetch` and `git pull --ff-only`; it never merges, rebases, stashes, or resets without user approval.
- **Safe cleanup**: abandoned sessions delete only files recorded in the session manifest.

## Requirements

- Node.js 20 or later.
- An Obsidian vault directory.
- Git is required only for remote mode or local commit support.

## Installation

Install from npm after the package is published:

```sh
npm install -g @orvix/memo
```

For local testing from this repository:

```sh
npm install -g ./orvix-memo-0.1.0.tgz
```

Then install the AI skill into your tool:

```sh
memo install --target codex
```

Supported targets are `codex`, `claude`, `kiro`, `cursor`, and `all`:

```sh
memo install --target claude
memo install --target kiro
memo install --target cursor
memo install --target all
```

## Quick Start

Initialize Memo:

```sh
memo init
```

During setup, choose:

- Language: English or Simplified Chinese.
- Mode:
  - `local`: write to the local vault only.
  - `remote`: pull before writing, commit and push after confirmation.
- Notes directory:
  - `Auto`: recommended; the AI chooses the folder based on note content.
  - Custom folder: always write into a fixed vault-relative directory.
- Install target: Codex, Claude Code, Kiro, Cursor, or skip.

Check the current configuration:

```sh
memo info
```

Check readiness:

```sh
memo doctor --quiet
```

In remote mode, manually run controlled sync when needed:

```sh
memo sync
```

Use the installed skill in your AI tool:

```text
$memo Save this discussion as a project decision note.
```

The AI will create or update a draft, report the note path, and wait for your confirmation before any commit or push.

## CLI Overview

```sh
memo help
memo init
memo info
memo doctor --quiet
memo sync
memo install --target codex
memo write --session <id> --title <title> --content-file <file>
memo write --session <id> --title <title> --path <vault-relative.md> --content-file <file>
memo status --session <id>
memo commit --session <id> --message <message>
memo push
```

When notes directory is `auto`, callers must provide a vault-relative Markdown path:

```sh
memo write \
  --session research-001 \
  --title "Open Source Marketing System Selection" \
  --path "Project Research/Open Source Marketing System Selection.md" \
  --content-file /tmp/note.md
```

## Remote Mode Safety

Remote mode is intentionally conservative:

- Before writing, Memo checks that the vault is a Git worktree with a valid remote and branch.
- `memo sync` only performs fast-forward-safe sync.
- `memo write` does not perform a second remote pull after readiness checks.
- Commit and push happen only after explicit user confirmation.
- Memo never commits unrelated vault changes.
- Merge, rebase, stash, reset, and conflict resolution require explicit user approval.

## Open Source License

Memo is released under the MIT License. See [LICENSE](./LICENSE).
