## ADDED Requirements

### Requirement: 初始化记录 vault 配置
CLI SHALL 提供 `memo init`，用于配置用户的语言、运行模式、Obsidian vault 路径，并把稳定配置写入 `~/.config/memo/config`。

#### Scenario: 初始化成功
- **WHEN** 用户使用有效 vault 路径完成 `memo init`
- **THEN** 配置文件中包含语言、运行模式、vault 路径、笔记目录、附件目录和 initialized 标记

### Requirement: 初始化展示 memo banner
`memo init` SHALL 在交互式初始化开始时展示 ASCII `MEMO` banner。

#### Scenario: 用户启动交互式初始化
- **WHEN** 用户运行 `memo init`
- **THEN** CLI 在第一个交互问题前展示 MEMO ASCII banner

### Requirement: 初始化模式选项解释含义
`memo init` SHALL 在模式选择中解释 local 和 remote 的行为差异。

#### Scenario: 用户选择运行模式
- **WHEN** 用户进入 `memo init` 的模式选择步骤
- **THEN** local 选项说明只写入本地仓库且不执行 pull/push
- **AND** remote 选项说明写入前执行 fast-forward-only pull，确认后可 commit/push

### Requirement: 初始化支持 Auto 笔记目录策略
`memo init` SHALL 允许用户在 notes directory 步骤选择 `Auto` 或自定义固定目录。

#### Scenario: 用户选择 Auto
- **WHEN** 用户在 notes directory 步骤选择 `Auto`
- **THEN** 配置文件保存 `MEMO_NOTES_DIR` 为 `auto`
- **AND** 后续写入要求调用方提供 vault-relative 目标路径

#### Scenario: 用户选择自定义固定目录
- **WHEN** 用户在 notes directory 步骤选择自定义目录并输入 `Notes`
- **THEN** 配置文件保存 `MEMO_NOTES_DIR` 为 `Notes`

### Requirement: 初始化持久化用户确认的稳定偏好
`memo init` SHALL 将用户确认过的稳定偏好写入配置文件，包括语言、运行模式、安装目标和本地 commit 偏好。

#### Scenario: 用户启用本地 commit 偏好
- **WHEN** 用户在本地模式初始化中确认启用本地 commit
- **THEN** 配置文件包含表示本地 commit 已启用的字段

#### Scenario: 用户禁用本地 commit 偏好
- **WHEN** 用户在本地模式初始化中确认不启用本地 commit
- **THEN** 配置文件包含表示本地 commit 已禁用的字段

### Requirement: 初始化提供可跳过的 skill 安装流程
`memo init` SHALL 在初始化流程中提供 Codex、Claude Code、暂时跳过三个 skill 安装选项。

#### Scenario: 用户选择 Codex
- **WHEN** 用户在初始化安装步骤选择 Codex
- **THEN** CLI 安装 Codex 对应 memo skill
- **AND** 配置文件记录已确认安装目标包含 `codex`

#### Scenario: 用户选择暂时跳过
- **WHEN** 用户在初始化安装步骤选择暂时跳过
- **THEN** 初始化仍成功完成
- **AND** CLI 不安装任何平台 skill

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
