## 1. 包结构与 CLI 骨架

- [x] 1.1 创建 `@orvix/memo` npm 包结构，包含 `package.json`、`bin/memo`、`cli/`、`skill/`、`scripts/` 和 `templates/`。
- [x] 1.2 实现 Node CLI dispatcher，并支持 `memo`、`memo --help` 和 `memo help` 展示全部命令。
- [x] 1.3 引入 `@inquirer/prompts` 并封装交互式选择、确认和多选能力。
- [x] 1.4 建立 i18n 文案层，至少支持 English 和简体中文。
- [x] 1.5 统一 shell 脚本规范，包括严格错误处理、路径校验和一致的用户错误提示。

## 2. 交互式初始化与信息展示

- [x] 2.1 实现 `memo init` 的语言选择流程：English / 简体中文。
- [x] 2.2 实现 `memo init` 的模式选择流程：本地模式 / 远端同步模式。
- [x] 2.3 实现 vault 路径、notes 目录、assets 目录的交互式配置，并保留非交互参数。
- [x] 2.4 本地模式下检测 vault 是否为 Git 工作区；如果是，询问是否启用确认后本地 commit。
- [x] 2.5 实现 `~/.config/memo/config` 配置文件写入，并确保语言、模式、安装目标、本地 commit 偏好等稳定确认状态使用 shell-safe quoting 持久化。
- [x] 2.6 实现 `memo info`，展示语言、模式、vault、目录、平台安装状态、本地 commit 偏好，以及远端模式下的 Git 信息。
- [x] 2.7 实现 `memo config`，支持修改语言、模式、vault 路径、notes/assets 目录、本地 commit 偏好和已确认安装目标。
- [x] 2.8 在 `memo config` 修改模式或路径时复用 init/doctor 校验逻辑，并使用 shell-safe quoting 更新配置文件。

## 3. 初始化校验与 Doctor

- [x] 3.1 实现本地模式校验：vault 存在、可写，notes/assets 目录可创建或可写。
- [x] 3.2 本地模式启用本地 commit 时，额外校验 vault 是可提交的 Git 工作区，但不校验 remote。
- [x] 3.3 实现远端模式校验：vault 可写、Git worktree、remote 存在、当前分支可识别、`git pull --ff-only` 成功。
- [x] 3.4 在远端模式 Git worktree 校验失败时，输出普通 `git clone` 仓库目录就是 Git worktree 的解释和修复建议。
- [x] 3.5 实现 `memo doctor` 和 `memo doctor --quiet`，并按 local/remote 模式执行不同 readiness 检查。

## 4. 平台 Skill 安装

- [x] 4.1 实现 `memo install` 交互列表，支持上下键移动、空格选择、回车确认。
- [x] 4.2 实现 `memo install --target codex`，把 `skill/SKILL.md` 和元数据安装到 Codex skill 目录。
- [x] 4.3 在 Claude Code 目标目录约定确认后，实现 `memo install --target claude`。
- [x] 4.4 实现 `memo install --target all`，并按平台分别输出成功或失败结果。
- [x] 4.5 确保平台安装和 npm 升级不会覆盖 `~/.config/memo/config`。

## 5. 笔记与附件写入

- [x] 5.1 实现 `memo write`，支持 Markdown content file、标题 sanitize、目录选择和 vault 内唯一 draft `.md` 路径。
- [x] 5.2 实现同一归档会话内的 draft 更新，用户要求修改时更新同一份 Markdown 文件。
- [x] 5.3 实现 session manifest，记录本次创建的 draft 文件、附件文件和运行模式，存放在 `~/.config/memo/state/sessions/` 而不是 `~/.config/memo/config` 或 Obsidian vault。
- [x] 5.4 实现图片附件复制，放入配置指定的 asset layout，并在同一归档会话内复用附件目录。
- [x] 5.5 从笔记文件到复制后的附件文件生成 vault-relative Markdown 图片链接。
- [x] 5.6 实现放弃归档清理：根据 session manifest 删除本次会话创建过的 draft 文件和全部附件文件，包括修改过程中被替换的附件。
- [x] 5.7 当笔记内容为空、目标路径逃逸 vault、任一附件不可读时，写入必须原子失败。

## 6. Git 状态、提交与推送

- [x] 6.1 实现远端模式运行时 pull 行为，使用配置中的 remote 和 fast-forward-only 策略。
- [x] 6.2 实现 `memo status`，在写入后报告 note 路径、附件路径和模式相关状态；远端模式额外报告 Git diff 摘要。
- [x] 6.3 实现 `memo commit --message <message>`，支持远端模式和启用本地 commit 的本地模式，确保只有用户确认归档后的笔记和复制附件才会提交。
- [x] 6.4 实现远端模式 `memo push`，推送到配置中的 remote 和 branch。
- [x] 6.5 在本地模式下跳过 pull、push 和 remote 同步操作；若启用本地 commit，则确认后只 commit 不 push。

## 7. Skill 指令与验证

- [x] 7.1 编写 `skill/SKILL.md`，明确 `$memo` 按 local/remote 模式分支执行：doctor、可选 pull、write、report、等待确认、可选本地 commit、远端 commit/push。
- [x] 7.2 添加 Codex 发现所需 metadata，并确保 skill name 为 `memo`。
- [x] 7.3 增加 CLI 测试或 smoke check，覆盖 help/info/config、init 语言选择、`@inquirer/prompts` 交互封装、本地模式、本地 commit 偏好、远端模式失败、doctor readiness、write 路径安全、附件复制和 commit gating。
- [x] 7.4 对照 OpenSpec requirements 验证 CLI 和 skill 行为。
