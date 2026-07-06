# Brainstorm Summary

- Change: memo
- Date: 2026-07-06

## 确认的技术方案

`memo` 是面向 Obsidian vault 的多端 AI 笔记归档 skill 和 CLI。npm 包名为 `@orvix/memo`，全局命令为 `memo`，Codex 等支持 `$skill` 语法的平台通过 `$memo` 调用。

安装拆成两层：第一层通过 `npm install -g @orvix/memo` 安装 CLI；第二层通过 `memo install` 或 `memo install --target codex|claude|all` 安装到 Codex、Claude Code 等目标工具。交互式安装使用 `@inquirer/prompts`，让用户通过上下键移动、空格选择、回车确认。

CLI 交互层使用 Node.js 和 `@inquirer/prompts`，核心确定性文件和 Git 操作使用 POSIX `sh` 脚本。这样不要求用户额外安装 Python，同时保留稳定的终端选择体验。

配置统一收拢到 `~/.config/memo/`：

```text
~/.config/memo/
├── config
└── state/
    └── sessions/
        └── <session-id>.manifest
```

`config` 只保存稳定偏好，例如语言、模式、vault 路径、notes/assets 目录、安装目标和本地 commit 偏好。`state/sessions/` 保存一次归档会话的临时 manifest，用于同一 draft 修改、确认归档或放弃归档清理。

`memo init` 先选择语言，再选择模式。语言支持 English 和简体中文。模式支持 local 和 remote。本地模式只校验 vault 文件系统可用性，不校验 remote，不执行 pull/push；如果 vault 是 Git 工作区，可在用户确认后启用“确认归档后本地 commit”。远端模式要求 vault 是 Git worktree、有 remote、有 branch，并且 `git pull --ff-only` 可成功。

运行时协议为：每次 `$memo` 调用先检查初始化和 doctor 状态；远端模式先 fast-forward pull；之后写入 Markdown draft 和图片附件；把本次创建的 draft 和附件记录到 session manifest；向用户返回路径和状态；用户要求修改时更新同一份 draft；用户确认归档后才 commit，远端模式随后 push；用户放弃归档时根据 manifest 删除本次创建的 draft 和附件，不 commit、不 push。

## 关键取舍与风险

- 两层安装避免 npm 安装时静默修改 Codex 或 Claude Code 目录，也让 CLI 升级和平台 skill 安装解耦。
- 使用 Node prompt 是为了稳定支持方向键、多选和确认；核心操作用 sh 避免 Python 解释器成本。
- 本地模式不能保证跨设备同步，因此 `memo info` 和初始化提示必须明确说明不会执行 remote 校验、pull 或 push。
- 远端模式只支持 fast-forward-only pull，不自动处理 merge conflict。冲突时停止并提示用户手动修复 vault 同步问题。
- session manifest 必须是临时运行状态，不能写入 Obsidian vault，也不能写入 `config`，否则会污染笔记仓库或稳定配置。
- 配置文件采用 shell 可读取格式时必须做 shell-safe quoting，并在使用路径前校验路径仍位于 vault 内。
- 第一版只承诺新建笔记的 draft 清理；如果未来支持修改已有笔记，需要增加原文件备份或 patch manifest。
- 图片附件会增加仓库体积，第一版先保证布局可预测，Git LFS 等大文件策略作为后续增强。

## 测试策略

- CLI smoke tests：覆盖 `memo help`、`memo info`、`memo config`、`memo init` 参数模式和交互封装。
- 本地模式测试：vault 可写、非 Git vault 成功、Git vault 本地 commit 偏好、禁用本地 commit 后不提交。
- 远端模式测试：非 Git worktree、缺 remote、缺 branch、`git pull --ff-only` 失败、pull 成功后继续写入。
- 写入安全测试：标题 sanitize、目标路径不能逃逸 vault、空内容失败、附件不可读时原子失败。
- 归档协议测试：确认前不 commit、不 push；修改更新同一 draft；确认后 remote commit/push；放弃归档清理 draft 和附件。
- 平台安装测试：交互式多选、`--target codex`、`--target all`、安装不覆盖 `~/.config/memo/config`。

## Spec Patch

无。当前 OpenSpec delta spec 已覆盖已确认的安装、初始化、CLI、local/remote、session manifest、附件、确认后 commit/push 和放弃归档行为。
