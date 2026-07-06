# Comet Design Handoff

- Change: memo
- Phase: design
- Mode: compact
- Context hash: 205c33c7734e303e4779294ef9de1f1addbd28805ab7937d7df82c2693d28dd2

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/memo/proposal.md

- Source: openspec/changes/memo/proposal.md
- Lines: 1-36
- SHA256: 26b0428596a5981a227426e66920cbbcc8628850f4637d7ea4e5961224a66b44

```md
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
```

## openspec/changes/memo/design.md

- Source: openspec/changes/memo/design.md
- Lines: 1-404
- SHA256: cf9db32191c0f32e034f5dbcdfa518ec35da74e4c6cbc81e0170504d50114d15

[TRUNCATED]

```md
## Context（背景）

现有本地 `note` skill 会把 Markdown 写入一个硬编码的 Obsidian 路径，并通过 Python helper 完成写入。这只是当前实现背景，不是新方案要继承的运行时依赖。新的 `memo` 应通过 npm 分发，并在用户安装后提供低摩擦的 CLI 初始化、平台安装和运行时归档能力。

新的产品名为 `memo`。npm 包名为 `@orvix/memo`，CLI 命令为 `memo`，AI skill 调用名也为 `memo`，在 Codex 这类支持 `$skill` 语法的平台中通过 `$memo` 触发。

实现策略调整为：交互式 CLI 使用 npm 环境自带的 Node.js 和 `@inquirer/prompts` 完成，核心文件/Git 操作优先由 POSIX `sh` 脚本完成。这样既避免 Python 安装成本，又能支持上下键、空格多选、回车确认等终端交互体验。

## Goals / Non-Goals（目标 / 非目标）

**Goals（目标）：**

- 以 `@orvix/memo` 作为 npm 包发布，并提供全局 `memo` CLI。
- 支持 `memo help` 展示全部命令。
- 支持 `memo info` 展示当前语言、运行模式、vault 路径和远端模式下的 Git 信息。
- 支持 `memo config` 在第一版修改语言、模式、vault 路径、notes/assets 目录、本地 commit 偏好和安装目标。
- 支持显式安装到 Codex、Claude Code 或所有受支持 AI 工具；交互模式下先列出可安装目标，再让用户用上下键移动、空格选择、回车确认。
- 在首次初始化时先选择语言：English 或简体中文。
- 支持本地模式和远端同步模式。
- 本地模式只校验 vault 文件系统可用性，不强制 Git，不校验 remote，不执行 pull/push；如果 vault 是 Git 工作区，第一版支持用户确认后执行本地 commit。
- 远端模式校验 vault 是 Git 工作区、有 remote、有 branch，并且可以 fast-forward pull。
- 把 Markdown 笔记和图片附件写入可预测的 vault 相对路径。
- 在 commit 和 push 前必须等待用户确认。
- npm 升级不能覆盖用户配置。

**Non-Goals（非目标）：**

- 不开发 Obsidian 插件。
- 不替用户创建或托管 Git 远端仓库。
- 不自动解决 Git merge conflict。
- 不在用户确认前自动提交或推送 AI 生成笔记。
- 不要求用户安装 Python。
- 第一版不承诺原生 Windows 终端完整 TUI 体验；Windows 用户可先通过 WSL 或 Git Bash 使用。

## Decisions（设计决策）

### Decision 1: npm 包使用 `@orvix/memo`，其他入口统一使用 `memo`

包名使用 `@orvix/memo`；命令、skill 名称和调用名统一使用 `memo`。

理由：

- npm scoped package 可以规避全局包名冲突，同时保留短命令体验。
- `memo` 足够短，适合频繁在 CLI 和 AI 对话中调用。
- 相比泛泛的 `note`，`memo` 更接近“整理后的记录 / 备忘 / 记忆沉淀”的含义。

备选方案：`vaultnote`、`memovault`、`vemo`、`inkvault`。这些名字更有品牌感，但作为命令行入口不如 `memo` 直接。

### Decision 2: 安装拆成 npm 安装和平台安装两层

安装流程分两步：

```sh
npm install -g @orvix/memo
memo install
```

`memo install` 默认进入交互模式：

1. 检测当前支持并可安装的工具，例如 Codex、Claude Code。
2. 在终端中列出目标工具。
3. 用户通过上下键移动，空格选择一个或多个目标，回车确认。
4. CLI 按目标分别执行安装，并输出每个目标的成功或失败原因。

也保留非交互参数，便于自动化：

```sh
memo install --target codex
memo install --target claude
memo install --target all
```

理由：

- npm 安装只负责安装工具，不应静默修改 Codex 或 Claude Code 目录。
- 交互式安装降低新用户理解成本。
- 非交互参数保留脚本化和 CI 场景。
- 用户可以单独升级 CLI，而不强制覆盖已安装的平台 skill 文件。

备选方案：通过 npm `postinstall` 自动写入 skill 文件。该方案被拒绝，因为它隐藏副作用，并且平台相关失败很难解释。
```

Full source: openspec/changes/memo/design.md

## openspec/changes/memo/tasks.md

- Source: openspec/changes/memo/tasks.md
- Lines: 1-59
- SHA256: 44c3e92ec9482a59586a22f2c8c90dbe9b5c8d923b6e053ef72683be8e99c71e

```md
## 1. 包结构与 CLI 骨架

- [ ] 1.1 创建 `@orvix/memo` npm 包结构，包含 `package.json`、`bin/memo`、`cli/`、`skill/`、`scripts/` 和 `templates/`。
- [ ] 1.2 实现 Node CLI dispatcher，并支持 `memo`、`memo --help` 和 `memo help` 展示全部命令。
- [ ] 1.3 引入 `@inquirer/prompts` 并封装交互式选择、确认和多选能力。
- [ ] 1.4 建立 i18n 文案层，至少支持 English 和简体中文。
- [ ] 1.5 统一 shell 脚本规范，包括严格错误处理、路径校验和一致的用户错误提示。

## 2. 交互式初始化与信息展示

- [ ] 2.1 实现 `memo init` 的语言选择流程：English / 简体中文。
- [ ] 2.2 实现 `memo init` 的模式选择流程：本地模式 / 远端同步模式。
- [ ] 2.3 实现 vault 路径、notes 目录、assets 目录的交互式配置，并保留非交互参数。
- [ ] 2.4 本地模式下检测 vault 是否为 Git 工作区；如果是，询问是否启用确认后本地 commit。
- [ ] 2.5 实现 `~/.config/memo/config` 配置文件写入，并确保语言、模式、安装目标、本地 commit 偏好等稳定确认状态使用 shell-safe quoting 持久化。
- [ ] 2.6 实现 `memo info`，展示语言、模式、vault、目录、平台安装状态、本地 commit 偏好，以及远端模式下的 Git 信息。
- [ ] 2.7 实现 `memo config`，支持修改语言、模式、vault 路径、notes/assets 目录、本地 commit 偏好和已确认安装目标。
- [ ] 2.8 在 `memo config` 修改模式或路径时复用 init/doctor 校验逻辑，并使用 shell-safe quoting 更新配置文件。

## 3. 初始化校验与 Doctor

- [ ] 3.1 实现本地模式校验：vault 存在、可写，notes/assets 目录可创建或可写。
- [ ] 3.2 本地模式启用本地 commit 时，额外校验 vault 是可提交的 Git 工作区，但不校验 remote。
- [ ] 3.3 实现远端模式校验：vault 可写、Git worktree、remote 存在、当前分支可识别、`git pull --ff-only` 成功。
- [ ] 3.4 在远端模式 Git worktree 校验失败时，输出普通 `git clone` 仓库目录就是 Git worktree 的解释和修复建议。
- [ ] 3.5 实现 `memo doctor` 和 `memo doctor --quiet`，并按 local/remote 模式执行不同 readiness 检查。

## 4. 平台 Skill 安装

- [ ] 4.1 实现 `memo install` 交互列表，支持上下键移动、空格选择、回车确认。
- [ ] 4.2 实现 `memo install --target codex`，把 `skill/SKILL.md` 和元数据安装到 Codex skill 目录。
- [ ] 4.3 在 Claude Code 目标目录约定确认后，实现 `memo install --target claude`。
- [ ] 4.4 实现 `memo install --target all`，并按平台分别输出成功或失败结果。
- [ ] 4.5 确保平台安装和 npm 升级不会覆盖 `~/.config/memo/config`。

## 5. 笔记与附件写入

- [ ] 5.1 实现 `memo write`，支持 Markdown content file、标题 sanitize、目录选择和 vault 内唯一 draft `.md` 路径。
- [ ] 5.2 实现同一归档会话内的 draft 更新，用户要求修改时更新同一份 Markdown 文件。
- [ ] 5.3 实现 session manifest，记录本次创建的 draft 文件、附件文件和运行模式，存放在 `~/.config/memo/state/sessions/` 而不是 `~/.config/memo/config` 或 Obsidian vault。
- [ ] 5.4 实现图片附件复制，放入配置指定的 asset layout，并在同一归档会话内复用附件目录。
- [ ] 5.5 从笔记文件到复制后的附件文件生成 vault-relative Markdown 图片链接。
- [ ] 5.6 实现放弃归档清理：根据 session manifest 删除本次会话创建过的 draft 文件和全部附件文件，包括修改过程中被替换的附件。
- [ ] 5.7 当笔记内容为空、目标路径逃逸 vault、任一附件不可读时，写入必须原子失败。

## 6. Git 状态、提交与推送

- [ ] 6.1 实现远端模式运行时 pull 行为，使用配置中的 remote 和 fast-forward-only 策略。
- [ ] 6.2 实现 `memo status`，在写入后报告 note 路径、附件路径和模式相关状态；远端模式额外报告 Git diff 摘要。
- [ ] 6.3 实现 `memo commit --message <message>`，支持远端模式和启用本地 commit 的本地模式，确保只有用户确认归档后的笔记和复制附件才会提交。
- [ ] 6.4 实现远端模式 `memo push`，推送到配置中的 remote 和 branch。
- [ ] 6.5 在本地模式下跳过 pull、push 和 remote 同步操作；若启用本地 commit，则确认后只 commit 不 push。

## 7. Skill 指令与验证

- [ ] 7.1 编写 `skill/SKILL.md`，明确 `$memo` 按 local/remote 模式分支执行：doctor、可选 pull、write、report、等待确认、可选本地 commit、远端 commit/push。
- [ ] 7.2 添加 Codex 发现所需 metadata，并确保 skill name 为 `memo`。
- [ ] 7.3 增加 CLI 测试或 smoke check，覆盖 help/info/config、init 语言选择、`@inquirer/prompts` 交互封装、本地模式、本地 commit 偏好、远端模式失败、doctor readiness、write 路径安全、附件复制和 commit gating。
- [ ] 7.4 对照 OpenSpec requirements 验证 CLI 和 skill 行为。
```

## openspec/changes/memo/specs/memo-cli-experience/spec.md

- Source: openspec/changes/memo/specs/memo-cli-experience/spec.md
- Lines: 1-67
- SHA256: 3f1f5d6cf6d7bd16fbcf5c5876f5dd79fac3a35ecb425527ed0c80fd81bee916

```md
## ADDED Requirements

### Requirement: CLI 支持中英文语言选择
`memo init` SHALL 在首次初始化开始时让用户选择 English 或简体中文，并将选择写入配置。

#### Scenario: 用户选择简体中文
- **WHEN** 用户在 `memo init` 中选择简体中文
- **THEN** 后续 CLI 提示、错误信息、`memo help` 和 `memo info` 默认使用简体中文

#### Scenario: 用户选择 English
- **WHEN** 用户在 `memo init` 中选择 English
- **THEN** 后续 CLI 提示、错误信息、`memo help` 和 `memo info` 默认使用 English

### Requirement: CLI 支持交互式目标选择
`memo install` SHALL 在未提供 `--target` 时列出当前支持安装的 AI 工具，并允许用户通过上下键移动、空格选择、回车确认。

#### Scenario: 用户交互式选择 Codex
- **WHEN** 用户运行 `memo install` 并在列表中选择 Codex
- **THEN** CLI 只安装 Codex 对应的 memo skill 文件

#### Scenario: 用户选择多个目标
- **WHEN** 用户在 `memo install` 中选择多个支持的 AI 工具
- **THEN** CLI 对每个目标分别执行安装，并分别报告成功或失败结果

### Requirement: 交互式 CLI 使用稳定 prompt 依赖
CLI SHALL 使用 `@inquirer/prompts` 或等价的 npm prompt 能力实现交互式选择，而不是手写不稳定的终端按键解析。

#### Scenario: 用户进行多选
- **WHEN** 用户运行需要多选的交互式命令
- **THEN** CLI 支持方向键移动、空格选择和回车确认

### Requirement: CLI 提供 help 命令
`memo help` SHALL 展示当前 memo 支持的全部命令、命令用途和常用示例。

#### Scenario: 用户查看帮助
- **WHEN** 用户运行 `memo help`
- **THEN** CLI 展示 init、config、doctor、install、write、status、info、commit、push 和 help 命令

### Requirement: CLI 提供 info 命令
`memo info` SHALL 展示当前 memo 的核心配置和运行状态。

#### Scenario: 本地模式信息展示
- **WHEN** 用户在本地模式下运行 `memo info`
- **THEN** CLI 展示语言、模式、vault 路径、notes 目录、assets 目录、本地 commit 偏好，并说明不会执行 remote 校验、pull 或 push

#### Scenario: 远端模式信息展示
- **WHEN** 用户在远端模式下运行 `memo info`
- **THEN** CLI 展示语言、模式、vault 路径、notes 目录、assets 目录、Git remote 和 Git branch；最近一次同步检查状态如存在，仅作为诊断参考展示

### Requirement: CLI 提供 config 命令
`memo config` SHALL 允许用户在初始化后修改语言、模式、vault 路径、notes 目录、assets 目录、本地 commit 偏好和已确认安装目标。

#### Scenario: 用户修改语言
- **WHEN** 用户运行 `memo config` 并修改语言
- **THEN** CLI 更新配置文件中的语言字段，并在后续 CLI 输出中使用新语言

#### Scenario: 用户切换到远端模式
- **WHEN** 用户通过 `memo config` 将模式切换为 remote
- **THEN** CLI 复用远端模式初始化校验，确认 Git worktree、remote、branch 和 fast-forward pull 可用后才保存配置

#### Scenario: 用户切换到本地模式
- **WHEN** 用户通过 `memo config` 将模式切换为 local
- **THEN** CLI 复用本地模式校验，并清理或停用 remote-only 配置展示

#### Scenario: 用户启用本地 commit
- **WHEN** 用户通过 `memo config` 启用本地 commit 偏好
- **THEN** CLI 校验 vault 是可提交的 Git 工作区后才保存该偏好
```

## openspec/changes/memo/specs/memo-installation/spec.md

- Source: openspec/changes/memo/specs/memo-installation/spec.md
- Lines: 1-41
- SHA256: dd81e06aebe15ab12e9f1cdbf254005f222998b2957baa6175913e9ed677b02f

```md
## ADDED Requirements

### Requirement: npm 包暴露 memo CLI
`@orvix/memo` 包通过 npm 安装后 SHALL 提供全局 `memo` CLI 命令。

#### Scenario: 全局 CLI 安装成功
- **WHEN** 用户运行 `npm install -g @orvix/memo`
- **THEN** 用户的 PATH 中可以使用 `memo` 命令

#### Scenario: CLI 输出帮助信息
- **WHEN** 用户运行 `memo --help`
- **THEN** CLI 列出 init、config、doctor、install、write、status、info、commit、push 和 help 命令

### Requirement: Skill 安装必须由用户明确确认
CLI SHALL 只有在用户明确运行 `memo install --target <target>` 或在 `memo install` 交互列表中确认目标平台后，才可以把 skill 文件安装到 AI 工具目录。

#### Scenario: 安装到 Codex
- **WHEN** 用户运行 `memo install --target codex`
- **THEN** CLI 把 memo skill 安装到 Codex skill 目录，并且不修改 Claude Code 文件

#### Scenario: 交互式安装到 Codex
- **WHEN** 用户运行 `memo install` 并在交互列表中选择 Codex 后确认
- **THEN** CLI 把 memo skill 安装到 Codex skill 目录

#### Scenario: 安装到所有支持的平台
- **WHEN** 用户运行 `memo install --target all`
- **THEN** CLI 把 memo skill 安装到当前机器上所有已支持且可检测的平台

### Requirement: 安装过程保留用户配置
安装过程 SHALL NOT 把用户 vault 配置存放在 npm 包目录或平台 skill 目录中。

#### Scenario: npm 包升级
- **WHEN** 用户升级 `@orvix/memo`
- **THEN** `~/.config/memo/config` 中的既有用户配置保持不变

### Requirement: 平台 skill 调用名使用 memo
已安装的 skill metadata SHALL 暴露 skill name `memo`，支持 `$skill` 语法的平台可以通过 `$memo` 调用。

#### Scenario: Codex skill 安装成功
- **WHEN** 用户执行 `memo install --target codex` 后查看 Codex 可用 skill
- **THEN** 已安装的 skill 显示为 `memo`
```

## openspec/changes/memo/specs/memo-note-archiving/spec.md

- Source: openspec/changes/memo/specs/memo-note-archiving/spec.md
- Lines: 1-106
- SHA256: 118983cc686a70319fcb615c43d7b718c71b7a597e8212816fc52528cabfc388

[TRUNCATED]

```md
## ADDED Requirements

### Requirement: 运行时写入前校验可用性
`$memo` skill 工作流 SHALL 在写入任何笔记内容前，先按当前模式校验 memo 初始化状态和 vault 可用性。

#### Scenario: 初始化前调用 skill
- **WHEN** 用户在 `memo init` 成功完成前调用 `$memo`
- **THEN** skill 返回运行 `memo init` 的说明，并且不写入笔记

### Requirement: 远端模式写入前拉取远端变更
`$memo` skill 工作流 SHALL 在远端模式写入笔记前，对配置的 vault remote 执行 fast-forward-only pull。

#### Scenario: 远端拉取成功
- **WHEN** `$memo` 在远端模式被调用且 `git pull --ff-only` 成功
- **THEN** 可以继续执行笔记写入

#### Scenario: 远端拉取失败
- **WHEN** `$memo` 在远端模式被调用且 `git pull --ff-only` 失败
- **THEN** skill 停止执行，并提示用户需要手动同步 vault

#### Scenario: 本地模式不拉取远端
- **WHEN** `$memo` 在本地模式被调用
- **THEN** skill 不执行 remote 校验、pull 或 push

### Requirement: 笔记以 Markdown 写入配置的 vault
CLI SHALL 把生成的 Markdown 笔记写入配置的 vault，并位于配置的笔记目录下。

#### Scenario: 笔记写入成功
- **WHEN** skill 使用标题和 Markdown 内容调用 `memo write`
- **THEN** CLI 在配置的 vault 内写入 `.md` 文件，并返回文件路径

### Requirement: 修改使用同一份 draft 文件
`$memo` skill 工作流 SHALL 在用户确认归档前，把本次归档会话的修改写回同一份 draft 文件，而不是为每次修改创建新文件。

#### Scenario: 用户要求修改 draft
- **WHEN** 用户在确认归档前要求修改已经写入的笔记
- **THEN** skill 更新同一份 draft Markdown 文件和同一组会话附件路径

### Requirement: 归档会话记录 manifest
CLI SHALL 为每次写入记录归档会话 manifest，包含本次创建的 draft 文件、附件文件和运行模式，并且 manifest 必须存放在 `~/.config/memo/state/sessions/`，不得写入 Obsidian vault 或 `~/.config/memo/config`。

#### Scenario: draft 写入成功
- **WHEN** `memo write` 成功创建 draft 文件和附件
- **THEN** CLI 记录可用于确认归档或放弃归档的 session manifest

#### Scenario: 修改过程中替换附件
- **WHEN** 用户修改 draft 导致附件被替换或不再引用
- **THEN** session manifest 仍记录本次会话创建过的所有附件文件，以便放弃归档时清理

### Requirement: 附件复制到 vault 相对资源目录
CLI SHALL 把提供的图片附件复制到配置的资源目录，并在 Markdown 笔记中使用 vault 相对路径引用这些图片。

#### Scenario: 笔记包含图片
- **WHEN** skill 使用图片路径调用 `memo write`
- **THEN** CLI 把图片复制到配置的 asset layout，并写入指向复制后文件的 Markdown 图片链接

#### Scenario: 图片不可读取
- **WHEN** 图片路径不存在或不可读
- **THEN** 写入失败，并且不能创建半成品笔记

### Requirement: 远端模式 commit 和 push 必须等待用户确认
`$memo` skill 工作流 SHALL NOT 在用户明确确认生成结果前，在远端模式下 commit 或 push 已写入的笔记。

#### Scenario: 用户确认归档
- **WHEN** 笔记已经写入且用户确认可以归档
- **THEN** 远端模式下 skill 运行 `memo commit --message <message>` 和 `memo push`

#### Scenario: 用户要求修改
- **WHEN** 笔记已经写入但用户要求修改而非确认归档
- **THEN** skill 继续调整笔记流程，并且不 commit、不 push，直到后续获得确认

### Requirement: 放弃归档清理本次 draft
`$memo` skill 工作流 SHALL 在用户放弃归档时删除本次会话创建的 draft 文件和附件，并且不执行 commit 或 push。

#### Scenario: 用户放弃新建笔记归档
- **WHEN** 用户在确认归档前选择放弃本次新建笔记
- **THEN** skill 根据 session manifest 删除本次会话创建的 draft Markdown 文件和附件文件

#### Scenario: 放弃归档不提交
- **WHEN** 用户选择放弃归档
```

Full source: openspec/changes/memo/specs/memo-note-archiving/spec.md

## openspec/changes/memo/specs/memo-vault-initialization/spec.md

- Source: openspec/changes/memo/specs/memo-vault-initialization/spec.md
- Lines: 1-75
- SHA256: 566e8b5466bc1f44f46db230f2e2ed815455280386fd506446fc73ae8ec58108

```md
## ADDED Requirements

### Requirement: 初始化记录 vault 配置
CLI SHALL 提供 `memo init`，用于配置用户的语言、运行模式、Obsidian vault 路径，并把稳定配置写入 `~/.config/memo/config`。

#### Scenario: 初始化成功
- **WHEN** 用户使用有效 vault 路径完成 `memo init`
- **THEN** 配置文件中包含语言、运行模式、vault 路径、笔记目录、附件目录和 initialized 标记

### Requirement: 初始化持久化用户确认的稳定偏好
`memo init` SHALL 将用户确认过的稳定偏好写入配置文件，包括语言、运行模式、安装目标和本地 commit 偏好。

#### Scenario: 用户启用本地 commit 偏好
- **WHEN** 用户在本地模式初始化中确认启用本地 commit
- **THEN** 配置文件包含表示本地 commit 已启用的字段

#### Scenario: 用户禁用本地 commit 偏好
- **WHEN** 用户在本地模式初始化中确认不启用本地 commit
- **THEN** 配置文件包含表示本地 commit 已禁用的字段

### Requirement: 初始化支持本地模式
`memo init` SHALL 支持本地模式，并在本地模式下跳过 remote、branch、pull 和 push 相关校验。

#### Scenario: 本地模式初始化成功
- **WHEN** 用户选择本地模式并提供可写 vault 路径
- **THEN** 初始化成功且配置中的 `MEMO_MODE` 为 `local`

#### Scenario: 本地模式 vault 不是 Git 仓库
- **WHEN** 用户选择本地模式且 vault 不是 Git 仓库
- **THEN** 初始化仍可成功，因为本地模式不要求 Git remote 同步

#### Scenario: 本地模式 vault 是 Git 工作区
- **WHEN** 用户选择本地模式且 vault 是 Git 工作区
- **THEN** 初始化询问用户是否启用确认后的本地 commit，并保存该选择

### Requirement: 初始化校验 vault 文件系统访问
初始化流程 SHALL 校验配置的 vault 路径存在、是目录，并且当前用户可写。

#### Scenario: vault 路径不存在
- **WHEN** 用户提供不存在的路径
- **THEN** 初始化失败，并提示用户创建或选择有效的 Obsidian vault 目录

### Requirement: 远端模式初始化校验 Git 仓库状态
远端模式初始化流程 SHALL 校验配置的 vault 是 Git worktree、有 remote、有当前分支，并且可以通过 fast-forward-only pull 从远端拉取。

#### Scenario: 远端模式路径不是 Git worktree
- **WHEN** 用户选择远端模式并提供一个可写但不在 Git 工作区中的目录
- **THEN** 初始化失败，并解释普通 `git clone` 得到的仓库目录就是 Git worktree，同时提示用户配置 Git 仓库和 remote

#### Scenario: 远端拉取失败
- **WHEN** vault 有 remote 但 `git pull --ff-only` 失败
- **THEN** 初始化失败，并提示用户必须先修复远端同步问题才能启用 memo

### Requirement: Doctor 检查运行时可用性
CLI SHALL 提供 `memo doctor`，用于在初始化后按当前模式校验配置是否仍然可用。

#### Scenario: memo 尚未初始化
- **WHEN** 用户在完成 `memo init` 前运行 `memo doctor`
- **THEN** 命令失败，并提示用户先运行 `memo init`

#### Scenario: memo 已准备就绪
- **WHEN** 用户在成功初始化后运行 `memo doctor`
- **THEN** 命令成功退出，并报告配置的 vault 路径和当前运行模式

#### Scenario: 本地模式 doctor
- **WHEN** 用户在本地模式下运行 `memo doctor`
- **THEN** 命令只校验 vault 可写和目录可用性，不校验 remote 或 pull

#### Scenario: 本地模式启用本地 commit 的 doctor
- **WHEN** 用户在本地模式下启用了本地 commit 并运行 `memo doctor`
- **THEN** 命令额外校验 vault 是否仍是可提交的 Git 工作区，但不校验 remote 或 pull

#### Scenario: 远端模式 doctor
- **WHEN** 用户在远端模式下运行 `memo doctor`
- **THEN** 命令校验 vault、Git worktree、remote、branch 和 fast-forward pull
```

