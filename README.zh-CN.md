# Memo

[English README](./README.md)

Memo 是一个用于把 AI 生成的笔记、调研、决策、方案和附件归档到 Obsidian vault 的 CLI 与 AI Skill。

它面向 Codex、Claude Code 等 AI 工具设计。AI 不直接写你的 vault，而是通过 `memo` CLI 写入，因此可以获得稳定的路径校验、会话追踪、可选 Git 同步，以及 commit/push 前的用户确认流程。

## Memo 主要用来做什么

- 把 AI 生成的总结、调研笔记、项目计划、技术决策和参考资料保存到 Obsidian。
- 当笔记目录配置为 `auto` 时，让 AI 根据笔记内容自己判断应该写到哪个 vault 相对路径。
- 在用户确认前保留可修改的 draft，避免反复生成多个重复文件。
- 把图片或其他附件复制到配置的资源目录，并在 Markdown 中引用。
- 同时支持本地 vault 和 Git 远端同步 vault。

## 特点

- **面向 AI 的写入流程**：安装 `memo` skill 到 Codex 或 Claude Code 后，可以通过 `$memo` 调用。
- **适配 Obsidian 的 Markdown**：笔记可包含 `title`、`created`、`tags`、`status` 等 YAML frontmatter。
- **自动笔记路径**：将 notes directory 配置为 `auto` 后，由 AI 根据内容选择 vault-relative `.md` 路径。
- **会话 draft 机制**：同一个 session 多次写入会更新同一份 draft，不会反复创建重复文件。
- **附件归档**：图片附件会复制到配置的 assets 目录，并自动生成 Markdown 引用。
- **本地与远端两种模式**：
  - `local`：只写本地 vault，不 pull、不 push。
  - `remote`：写入前同步 Git，用户确认后才 commit 和 push。
- **受控 Git 同步**：`memo sync` 只执行 `git fetch` 和 `git pull --ff-only`，不会自动 merge、rebase、stash 或 reset。
- **安全清理**：放弃归档时，只删除 session manifest 中记录的本次 draft 和附件。

## 环境要求

- Node.js 20 或更高版本。
- 一个 Obsidian vault 目录。
- 只有 remote 模式或启用本地 commit 时才需要 Git。

## 安装

发布到 npm 后可直接安装：

```sh
npm install -g @orvix/memo
```

在本仓库本地测试：

```sh
npm install -g ./orvix-memo-0.1.0.tgz
```

然后把 AI skill 安装到你使用的工具：

```sh
memo install --target codex
```

支持的目标包括 `codex`、`claude`、`kiro`、`cursor` 和 `all`：

```sh
memo install --target claude
memo install --target kiro
memo install --target cursor
memo install --target all
```

## 快速开始

初始化 Memo：

```sh
memo init
```

初始化时需要选择：

- 语言：English 或简体中文。
- 模式：
  - `local`：只写入本地 vault。
  - `remote`：写入前 pull，同步成功后写入，用户确认后 commit/push。
- 笔记目录：
  - `Auto`：推荐，由 AI 根据笔记内容判断写到哪个文件夹。
  - 自定义固定目录：始终写入指定的 vault 相对目录。
- 安装目标：Codex、Claude Code、Kiro、Cursor 或暂时跳过。

查看当前配置：

```sh
memo info
```

检查是否可用：

```sh
memo doctor --quiet
```

remote 模式下，如需手动触发受控同步：

```sh
memo sync
```

在已安装 skill 的 AI 工具中使用：

```text
$memo 把这次讨论保存成一篇项目决策笔记。
```

AI 会创建或更新 draft，告诉你笔记路径，并在 commit 或 push 前等待你的明确确认。

## CLI 概览

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

当 notes directory 为 `auto` 时，调用方必须提供 vault-relative Markdown 路径：

```sh
memo write \
  --session research-001 \
  --title "开源营销系统选型分析" \
  --path "项目调研/开源营销系统选型分析.md" \
  --content-file /tmp/note.md
```

## Remote 模式的安全边界

Remote 模式是保守设计：

- 写入前会校验 vault 是 Git worktree，并且 remote、branch 可用。
- `memo sync` 只做 fast-forward 安全同步。
- `memo write` 在 readiness 检查之后不会再次触发远端 pull。
- commit 和 push 只会在用户明确确认后执行。
- Memo 不会提交 vault 中与本次归档无关的变更。
- merge、rebase、stash、reset 和冲突处理都需要用户明确授权。

## 开源协议

Memo 使用 MIT License 开源。详见 [LICENSE](./LICENSE)。
