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
