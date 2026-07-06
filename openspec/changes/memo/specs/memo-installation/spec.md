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

#### Scenario: 安装到 Kiro
- **WHEN** 用户运行 `memo install --target kiro`
- **THEN** CLI 把 memo skill 安装到 Kiro skill 目录，并记录已确认安装目标为 `kiro`

#### Scenario: 安装到 Cursor
- **WHEN** 用户运行 `memo install --target cursor`
- **THEN** CLI 把 memo skill 安装到 Cursor skill 目录，并记录已确认安装目标为 `cursor`

#### Scenario: 交互式安装到 Codex
- **WHEN** 用户运行 `memo install` 并在交互列表中选择 Codex 后确认
- **THEN** CLI 把 memo skill 安装到 Codex skill 目录

#### Scenario: 安装到所有支持的平台
- **WHEN** 用户运行 `memo install --target all`
- **THEN** CLI 把 memo skill 安装到 Codex、Claude Code、Kiro 和 Cursor 的支持目录

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
