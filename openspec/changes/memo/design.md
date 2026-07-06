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

### Decision 3: 交互式 CLI 用 Node 和 `@inquirer/prompts`，核心操作用 sh

新的包结构建议：

```text
memo/
├── package.json
├── bin/
│   └── memo
├── cli/
│   ├── index.js
│   ├── prompts.js
│   └── i18n.js
├── skill/
│   ├── SKILL.md
│   └── agents/
│       └── openai.yaml
├── scripts/
│   ├── memo-config.sh       # shared config read/write helpers
│   ├── memo-init.sh
│   ├── memo-doctor.sh
│   ├── memo-install.sh
│   ├── memo-write.sh
│   ├── memo-status.sh
│   ├── memo-configure.sh    # command implementation for `memo config`
│   ├── memo-commit.sh
│   └── memo-push.sh
└── templates/
    └── config.example
```

`package.json` 显式依赖 `@inquirer/prompts`。`bin/memo` 进入 Node CLI。Node CLI 负责：

- 命令解析。
- `memo help`。
- `memo info` 展示。
- `memo config` 交互式修改配置。
- 语言选择。
- 模式选择。
- 上下键、空格、回车式平台选择。
- 调用 `scripts/` 下的 shell 脚本执行确定性操作。

shell 脚本负责：

- 路径校验。
- 配置写入。
- vault 写入。
- 附件复制。
- Git pull、status、commit、push。

脚本命名约定：`memo-config.sh` 是共享配置读写 helper，供其他脚本 source；`memo-configure.sh` 是 `memo config` 命令的执行脚本，二者职责不同。

理由：

- 用户通过 npm 安装时已经具备 Node 环境，不增加额外解释器成本。
- `@inquirer/prompts` 已经解决方向键、多选、确认等终端交互细节，比手写 TUI 更稳。
- 用纯 `sh` 实现跨终端可靠的方向键和多选交互非常脆弱。
- 核心文件和 Git 操作继续用 sh，便于测试和在 AI skill 中直接调用。

备选方案：全部用 sh。该方案能减少技术栈，但交互体验差，且上下键/空格选择在不同 shell 和终端中不稳定。

### Decision 4: memo 文件收拢到 `~/.config/memo/`

memo 的用户配置和运行状态不放在 npm 包目录，也不放在平台 skill 目录，而是收拢到同一个 memo 应用目录：

```text
~/.config/memo/
├── config
└── state/
    └── sessions/
        └── <session-id>.manifest
```

`config` 存放稳定配置：

```sh
MEMO_LANGUAGE="zh-CN"
MEMO_MODE="remote"
MEMO_VAULT="/path/to/obsidian-vault"
MEMO_NOTES_DIR="Notes"
MEMO_ASSETS_DIR="assets"
MEMO_ATTACHMENT_LAYOUT="date-note"
MEMO_GIT_REMOTE="origin"
MEMO_GIT_BRANCH="main"
MEMO_LOCAL_GIT_COMMIT="disabled"
MEMO_CONFIRMED_INSTALL_TARGETS="codex,claude"
MEMO_INITIALIZED="true"
```

本地模式配置可以不包含 remote 和 branch：

```sh
MEMO_LANGUAGE="zh-CN"
MEMO_MODE="local"
MEMO_VAULT="/path/to/obsidian-vault"
MEMO_NOTES_DIR="Notes"
MEMO_ASSETS_DIR="assets"
MEMO_ATTACHMENT_LAYOUT="date-note"
MEMO_LOCAL_GIT_COMMIT="enabled"
MEMO_INITIALIZED="true"
```

理由：

- npm 包升级不应覆盖用户配置。
- Codex、Claude Code 和未来其他 AI 工具应共享同一份 memo 配置。
- shell 脚本可以直接读取该配置。
- 用户在初始化和安装中确认过的稳定偏好应持久化，避免后续重复询问同一决策。
- session manifest 和 config 收拢在同一 memo 应用目录，便于用户查看、备份和排障。

安全约束：实现时必须拒绝危险配置值，或只读取由 `memo init` 写入的配置文件。配置写入时必须使用 shell-safe quoting，并在使用路径前校验目标仍位于 vault 内。

边界：`config` 文件只持久化用户选择和偏好，不把一次性的外部状态当成永久事实。session manifest 是临时运行状态，放在 `~/.config/memo/state/sessions/`，不得写进 `config`，也不得写入 Obsidian vault。vault 是否仍存在、路径是否仍可写、远端是否有冲突这类状态仍需要运行时检查。

### Decision 5: 初始化先选语言，再选模式

`memo init` 默认进入交互式初始化：

1. 选择语言：English / 简体中文。
2. 选择模式：本地模式 / 远端同步模式。
3. 选择或输入 Obsidian vault 路径。
4. 配置 notes 目录和 assets 目录，提供默认值。
5. 本地模式下如果 vault 是 Git 工作区，询问是否启用“用户确认后本地 commit、不 push”，并把选择写入配置。
6. 按模式执行校验。
7. 写入 `~/.config/memo/config`。

也保留非交互参数：

```sh
memo init --language zh-CN --mode local --vault /path/to/vault
memo init --language en --mode remote --vault /path/to/vault --remote origin --branch main
```

理由：

- 语言应优先确定，因为后续所有提示、错误和帮助都依赖语言。
- 模式决定是否需要 Git remote 校验，必须早于 Git 检查。
- 交互式默认流程降低普通用户使用成本，非交互参数支持自动化。

### Decision 6: “Git worktree”只在远端模式中要求

这里的 Git worktree 指一个可工作的 Git checkout 目录。普通 `git clone` 下来的仓库目录就是 Git worktree；`git worktree add` 创建的附加工作区也是 Git worktree。要求它的原因是：memo 需要在 vault 目录中执行 `git status`、`git pull --ff-only`、`git commit` 和 `git push`，这些操作必须发生在 Git 工作区里。

远端模式校验：

1. vault 路径存在且可写。
2. vault 是 Git worktree。
3. Git remote 已配置。
4. 当前 branch 可识别。
5. `git pull --ff-only` 成功。

本地模式校验：

1. vault 路径存在且可写。
2. notes 目录和 assets 目录可创建或可写。
3. 不要求 vault 是 Git worktree。
4. 不校验 remote。
5. 不执行 pull、push 或同步检查。
6. 如果启用了本地 commit，则只校验本地 Git 工作区和 commit 能力，不校验 remote。

理由：

- 远端同步必须依赖 Git 工作区，否则无法可靠 pull/commit/push。
- 本地模式的目标是最低成本写入，不应强迫用户理解或配置 Git。
- 本地 commit 是本地模式的可选增强，只在用户明确确认并持久化偏好后执行。

### Decision 7: `memo help` 和 `memo info` 是一等命令

`memo help` 展示当前 memo 支持的全部命令、常用示例和当前语言下的简短说明。运行 `memo` 或 `memo --help` 时也展示同样信息。

`memo info` 展示核心状态：

- memo CLI 版本。
- 当前语言。
- 当前模式：local 或 remote。
- vault 路径。
- notes 目录。
- assets 目录。
- 已安装的平台 skill 状态。
- 本地模式下显示是否启用本地 commit。
- 远端模式下显示 Git remote 和 branch；如存在最近一次 doctor/pull 检查结果，只作为诊断参考展示，不作为 ready 状态依据。
- 本地模式下明确显示“不会执行 remote 校验、pull 或 push”。

理由：

- `doctor` 偏校验，`info` 偏展示，职责不同。
- 用户在多端环境中需要快速确认当前机器的 memo 配置。

### Decision 8: `memo config` 第一版提供配置修改入口

`memo config` 用于在初始化后修改稳定配置和偏好。它默认进入交互式配置界面，并支持按字段修改：

- 语言：English / 简体中文。
- 模式：local / remote。
- vault 路径。
- notes 目录。
- assets 目录。
- 本地 commit 偏好。
- 已确认安装目标。

修改规则：

- 修改语言只更新配置，不需要重新校验 vault。
- 修改模式、vault、notes 目录或 assets 目录时，必须复用 `memo init` / `memo doctor` 的校验逻辑。
- 切换到 remote 模式时，必须校验 Git worktree、remote、branch 和 fast-forward pull。
- 切换到 local 模式时，清理 remote-only 配置或将其标记为 inactive，避免 `memo info` 误导用户。
- 修改本地 commit 偏好时，如果启用该偏好，必须确认 vault 是可提交的 Git 工作区。

理由：

- 用户后续修改语言或模式是高频需求，不应该要求重新跑完整 init。
- `memo config` 比手动编辑 `~/.config/memo/config` 更安全，可以复用校验和 shell-safe quoting。

### Decision 9: 运行时按模式执行归档协议

`memo` 的 `SKILL.md` 必须规定 `$memo` 的强制执行顺序。

远端模式：

1. 运行 `memo doctor --quiet`。
2. 执行 fast-forward-only pull。
3. 根据用户请求生成 Markdown 内容。
4. 运行 `memo write` 创建本次归档会话的 draft 文件和附件。
5. 在 memo 状态目录记录本次归档会话 manifest，包含 draft note 路径、附件路径和模式信息。
6. 向用户返回 draft note 路径、附件路径和 Git diff 摘要。
7. 等待用户明确确认。
8. 用户要求修改时，继续更新同一份 draft 文件，而不是创建新文件。
9. 用户确认归档后，才运行 `memo commit --message "<message>"` 和 `memo push`。
10. 用户放弃归档时，依据 manifest 删除本次会话创建的 draft 文件和附件，不 commit、不 push。

本地模式：

1. 运行 `memo doctor --quiet`。
2. 不执行 pull。
3. 根据用户请求生成 Markdown 内容。
4. 运行 `memo write` 创建本次归档会话的 draft 文件和附件。
5. 在 memo 状态目录记录本次归档会话 manifest，包含 draft note 路径、附件路径和模式信息。
6. 向用户返回 draft note 路径和附件路径。
7. 等待用户确认内容完成。
8. 用户要求修改时，继续更新同一份 draft 文件，而不是创建新文件。
9. 用户确认归档后，如果 `MEMO_LOCAL_GIT_COMMIT="enabled"`，运行本地 `memo commit --message "<message>"`，但不执行 push。
10. 用户确认归档后，如果 `MEMO_LOCAL_GIT_COMMIT="disabled"`，只保留本地文件改动，不执行 commit 或 push。
11. 用户放弃归档时，依据 manifest 删除本次会话创建的 draft 文件和附件，不 commit、不 push。

理由：

- AI 生成的笔记经常需要用户审视。
- 本地模式不应包含同步副作用。
- 远端模式下写入和提交分离可以保持 Git 历史干净。
- 本地 commit 偏好在初始化时确认并写入配置，避免每次归档重复询问同一策略；每篇笔记的内容确认仍然必须保留。
- 确认前不 commit 是更合理的默认策略：未确认内容不进入 Git 历史，用户要求修改时也不会产生多次草稿提交。
- session manifest 是放弃归档和异常恢复的依据，避免通过路径猜测删除文件；manifest 应存放在 `~/.config/memo/state/sessions/`，不得写入 `~/.config/memo/config`，不得写入 Obsidian vault，也不得参与笔记 commit。
- manifest 必须记录本次会话创建过的所有 draft 和附件文件，包括修改过程中被替换或不再引用的附件，放弃归档时统一清理。
- 第一版只承诺新建笔记的 draft 清理；如果未来支持修改已有笔记，必须引入原文件备份或 patch manifest，放弃归档时恢复原内容。

### Decision 10: 图片附件存入 vault 内部的相对资源树

默认附件布局：

```text
Obsidian Vault/
├── Notes/
│   └── 2026-07-06-memo-skill-design.md
└── assets/
    └── 2026/
        └── 07/
            └── memo-skill-design/
                ├── image-1.png
                └── image-2.jpg
```

Markdown 中使用从笔记文件到附件文件的相对路径：

```markdown
![image-1](../assets/2026/07/memo-skill-design/image-1.png)
```

理由：

- 图片在 vault 内部，能随文件系统或 Git 一起保存。
- 按日期和笔记 slug 分组，避免所有附件堆在单个目录。
- 相对路径让 vault 在不同机器路径下仍可工作。

规则：

- `memo write` 先把图片复制到附件目录，再写最终 Markdown。
- 文件名需要 sanitize，并在冲突时生成唯一名称。
- 如果任一附件不存在或不可读，写入失败，不能留下半成品笔记。
- 远端模式下 `memo commit` 必须同时包含 `.md` 文件和复制后的附件文件。

## Risks / Trade-offs（风险与权衡）

- Node TUI 依赖 npm 环境 -> 用户已通过 npm 安装 memo，因此这是可接受依赖；核心操作仍保留 sh 入口。
- `@inquirer/prompts` 增加一个 npm 依赖 -> 换来稳定的交互式选择体验，且不会增加 Python 等额外系统依赖。
- Git pull 出现冲突 -> 远端模式写入前停止，并提示用户先手动解决 vault 同步问题。
- 本地模式没有远端备份 -> `memo info` 和初始化文案必须明确说明本地模式不会同步到其他设备。
- shell 配置注入风险 -> 只通过 `memo init` 写配置，所有值 shell-safe quoting，并在使用前校验路径。
- Codex 或 Claude Code 的 skill 目录约定变化 -> 平台路径检测集中放在安装逻辑中，失败时给出明确提示。
- 原生 Windows 支持不足 -> 第一版明确支持 macOS/Linux/WSL，不承诺 native Windows。
- 图片附件可能增大 Git 历史 -> 第一版保持附件布局可预测，Git LFS 等大文件策略作为后续增强。

## Migration Plan（迁移计划）

1. 创建 `@orvix/memo` 包骨架和 Node CLI dispatcher。
2. 引入 `@inquirer/prompts`，实现 i18n 文案层，支持 English 和简体中文。
3. 实现交互式 `memo init`：语言、模式、vault、目录配置。
4. 实现本地模式的本地 commit 偏好确认和配置持久化。
5. 实现 `memo help`、`memo info` 和 `memo config`。
6. 实现 `memo doctor`，并按 local/remote 模式执行不同校验。
7. 实现交互式 `memo install` 和非交互 `--target` 安装。
8. 实现 `memo write`，支持 Markdown 输出和图片附件复制。
9. 实现本地 commit、远端模式 `memo status`、`memo commit` 和 `memo push`。
10. 编写 `memo` skill 指令，强制执行按模式分支的运行时协议。
11. 迁移现有本地 `note` skill 的行为，用配置驱动的 `memo` 替代硬编码 vault 路径和 Python helper。

回滚策略：

- `memo uninstall --target <target>` 可移除已安装的 skill 文件，但不删除 `~/.config/memo/config` 或 `~/.config/memo/state/`。
- 手动回滚也安全，因为用户笔记仍然是 vault 中的普通 Markdown 和图片文件。

## Open Questions（待确认问题）

- 第一版是否同时支持 Codex 和 Claude Code 安装，还是先支持 Codex？
