## Why（为什么）

用户需要一种可移植、低使用成本的方式，把 Codex、Claude Code 等 AI CLI 中产生的笔记、总结、研究结果、计划和决策沉淀到 Obsidian vault 中。当前本地 `note` skill 绑定单机固定路径，并依赖 Python helper；这不适合 npm 分发、多端安装、交互式初始化、本地/远端模式切换和跨设备同步。

## What Changes（变更内容）

- 引入名为 `memo` 的 npm 分发 skill 和 CLI，npm 包名为 `@orvix/memo`。
- 采用两层安装模型：npm 安装 `memo` CLI，`memo install` 再通过基于 `@inquirer/prompts` 的交互式选择安装到 Codex、Claude Code 或其他受支持工具。
- 增加 CLI 体验能力：`memo help` 展示全部命令，`memo info` 展示当前语言、运行模式和 Git 配置等核心信息，`memo config` 修改已初始化配置。
- 增加首次初始化流程：先选择语言（English / 简体中文），再选择本地模式或远端同步模式，然后配置 Obsidian vault。
- 远端模式校验 Git 工作区、remote、branch 和 fast-forward pull；本地模式不校验 remote，也不执行同步相关检查。
- 定义 `$memo` 运行时行为：检查初始化状态，按模式决定是否从远端拉取，写入 Markdown 笔记和附件，返回执行结果，然后等待用户确认；远端模式确认后 commit 和 push，本地模式按已保存偏好决定是否执行本地 commit，但永不 push。
- 增加图片附件处理能力，把图片复制到稳定的 vault 相对路径下，并随笔记一起纳入后续归档。

## Capabilities（能力范围）

### New Capabilities（新增能力）

- `memo-cli-experience`：交互式 CLI、语言选择、工具选择、`memo help`、`memo info` 和 `memo config`。
- `memo-installation`：npm 包分发、CLI 入口、Codex/Claude Code skill 安装。
- `memo-vault-initialization`：首次配置、vault 路径存储、本地/远端模式、Git 仓库状态校验。
- `memo-note-archiving`：运行时写入笔记、放置附件、用户确认、本地归档或远端 commit/push 工作流。

### Modified Capabilities（修改能力）

- 无。

## Impact（影响范围）

- 新 npm 包名：`@orvix/memo`。
- 新 CLI 命令：`memo`。
- 新 skill 调用名：`$memo`。
- 新 memo 应用目录：`~/.config/memo/`，其中 `config` 存放稳定配置，`state/sessions/` 存放临时归档会话 manifest。
- 新增交互式 CLI 层，用于语言选择、模式选择、平台选择和本地 commit 偏好选择。
- 新增 shell 脚本，用于安装、初始化、健康检查、写入、状态查看、提交和推送。
- 现有本地 `note` skill 作为迁移参考，不再作为目标架构；新方案不依赖 Python。
