---
name: memo
description: Archive AI-generated notes and attachments into the user's configured Obsidian vault.
---

# memo

Use this skill when the user invokes `$memo` or asks to save, archive, record, remember, or write conversation content into their configured Obsidian vault through the `memo` CLI.

## Required Protocol

Before writing any file, run:

```sh
memo doctor --quiet
```

If the command fails, run `memo info` to determine the configured mode. In remote mode, run:

```sh
memo sync
memo doctor --quiet
```

If `memo sync` succeeds and the second doctor check passes, continue. If `memo sync` fails, stop and report the Git error. Do not attempt merge, rebase, stash, reset, or conflict resolution without explicit user approval. In local mode or uninitialized mode, stop and tell the user to run `memo init` or fix the reported vault problem. Do not create notes manually.

## Determine Mode

Run:

```sh
memo info
```

Use the reported mode:

- In local mode, do not run remote validation, `git pull`, or `memo push`.
- In remote mode, `memo doctor --quiet` performs the configured fast-forward-only pull before writing. If it fails, try `memo sync` once, then rerun `memo doctor --quiet`.

## Write Draft

Create the Markdown content requested by the user. Every note must start with Obsidian YAML frontmatter:

```md
---
title: <note title>
created: <YYYY-MM-DD>
tags:
  - <tag>
status: 待确认
---
```

Choose concise, useful tags from the note content. Use `status: 待确认` until the user explicitly confirms the archive. Put any image files to archive in readable local paths.

Check `memo info` for the Notes directory. If it reports `auto`, choose the best vault-relative Markdown path for the content, such as `项目调研/开源营销系统选型分析.md`, and pass it with `--path`. Do not use a placeholder folder named `auto`.

Call:

```sh
memo write --session <session-id> --title <title> --content-file <markdown-file> [--attachment <path> ...]
```

When Notes directory is `auto`, call:

```sh
memo write --session <session-id> --title <title> --path <vault-relative.md> --content-file <markdown-file> [--attachment <path> ...]
```

Use the same session id for all revisions of the same requested note. If the user asks for changes before confirmation, regenerate the Markdown and call `memo write` again with the same session id. This updates the same draft and session manifest instead of creating a new draft.

After each write, run:

```sh
memo status --session <session-id>
```

Report the draft path, attachment paths/count, and relevant mode status to the user.

## Confirmation Gate

Wait for explicit confirmation before archiving.

Do not commit or push before explicit confirmation. A user asking for edits, corrections, rewording, or more detail is not confirmation.

If the user confirms the note is ready:

- In remote mode, run:

```sh
memo commit --session <session-id> --message <message>
memo push
```

- In local mode with local commit enabled, run:

```sh
memo commit --session <session-id> --message <message>
```

- In local mode with local commit disabled, do not run commit or push. Report the local draft path and attachments.

If the user abandons or cancels the archive, run:

```sh
memo write --abandon --session <session-id>
```

This deletes only files recorded in the session manifest and does not commit or push.

## Safety Rules

- Do not write directly into the vault outside the `memo` CLI.
- Do not store user vault configuration in the skill directory.
- Do not commit unrelated vault changes.
- Do not push in local mode.
- Do not retry a failed remote pull by changing Git state. Only `memo sync` is allowed automatically; merge, rebase, stash, reset, or conflict resolution requires explicit user approval.
