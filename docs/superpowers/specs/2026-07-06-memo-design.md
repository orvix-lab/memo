---
comet_change: memo
role: technical-design
canonical_spec: openspec
---

# memo 技术设计

## 背景

`memo` 是一个通过 npm 分发的 Obsidian 笔记归档 CLI 和 AI skill。它用于把 Codex、Claude Code 等 AI CLI 中产生的总结、研究、计划、决策和图片附件写入用户自己的 Obsidian vault。

目标入口保持一致：

- npm 包：`@orvix/memo`
- CLI 命令：`memo`
- Codex 调用：`$memo`
- 应用配置目录：`~/.config/memo/`

新方案不依赖 Python。交互式 CLI 使用 Node.js 和 `@inquirer/prompts`，核心文件和 Git 操作优先使用 POSIX `sh` 脚本。

## 设计目标

- 用户可以通过 npm 安装 memo，并显式安装到 Codex、Claude Code 等支持平台。
- 首次初始化用交互式流程完成语言、模式、vault、notes 目录和 assets 目录配置。
- 支持 English 和简体中文。
- 支持 local 和 remote 两种运行模式。
- 本地模式不要求 Git remote，不执行 pull/push。
- 远端模式强制校验 Git worktree、remote、branch 和 fast-forward pull。
- 每次 `$memo` 调用都必须先校验初始化状态。
- 写入后先返回 draft 路径和附件路径，等待用户确认。
- 用户确认归档后才执行 commit；remote 模式确认后继续 push。
- 用户放弃归档时，清理本次会话创建的 draft 和附件。
- 图片附件存放在 vault 内部稳定资源目录，并用相对 Markdown 链接引用。

## 非目标

- 不实现 Obsidian 插件。
- 不替用户创建或托管 Git remote。
- 不自动解决 merge conflict。
- 不在用户确认前自动 commit 或 push。
- 不要求用户安装 Python。
- 第一版不承诺 native Windows 完整交互体验，优先支持 macOS、Linux、WSL 和 Git Bash。
- 第一版只处理新建笔记的放弃清理；修改已有笔记需要后续引入备份或 patch manifest。

## 总体架构

```text
@orvix/memo
├── bin/
│   └── memo
├── cli/
│   ├── index.js
│   ├── prompts.js
│   └── i18n.js
├── skill/
│   ├── SKILL.md
│   └── agents/
├── scripts/
│   ├── memo-config.sh
│   ├── memo-init.sh
│   ├── memo-doctor.sh
│   ├── memo-install.sh
│   ├── memo-write.sh
│   ├── memo-status.sh
│   ├── memo-configure.sh
│   ├── memo-commit.sh
│   └── memo-push.sh
└── templates/
    └── config.example
```

Node CLI 负责命令解析、i18n、交互式选择、多选确认和调用 shell 脚本。shell 脚本负责确定性操作：配置读写、路径校验、vault 写入、附件复制、Git 状态检查、commit 和 push。

这种拆分把用户交互和系统副作用分开：Node 处理终端体验，sh 处理可复用、可测试、可被 skill 直接调用的核心流程。

## 安装模型

安装分为两层：

```sh
npm install -g @orvix/memo
memo install
```

第一层 npm 安装只把 CLI 放到用户 PATH 中，不修改 Codex 或 Claude Code 配置。第二层 `memo install` 才安装平台 skill 文件。交互式安装会列出当前支持的目标工具，用户通过上下键移动、空格选择、回车确认。也支持非交互参数：

```sh
memo install --target codex
memo install --target claude
memo install --target all
```

这样可以避免 npm `postinstall` 隐式修改用户工具目录，也让 CLI 升级和平台 skill 安装解耦。平台安装成功后，已确认目标写入配置，供 `memo info` 展示和后续检查使用。

## 配置与状态

所有用户配置和运行状态收拢在：

```text
~/.config/memo/
├── config
└── state/
    └── sessions/
        └── <session-id>.manifest
```

`config` 是稳定配置，示例：

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

local 模式可以没有 remote 和 branch：

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

`state/sessions/<session-id>.manifest` 是单次归档会话状态，记录 draft 文件、附件文件、运行模式和是否已归档。它不进入 Obsidian vault，不进入 Git commit，也不写入 `config`。

配置写入必须使用 shell-safe quoting。读取配置后，所有路径都要再次校验，尤其是 notes 目录、assets 目录和附件目标路径，必须保证最终路径仍在 vault 内。

## 初始化流程

`memo init` 默认交互式执行：

1. 展示 ASCII `MEMO` banner，让用户明确进入 memo 初始化向导。
2. 选择语言：English 或简体中文。
3. 选择模式：local 或 remote。每个模式选项必须用括号解释含义：local 表示只写入本地 Obsidian 仓库、不执行 pull/push；remote 表示写入前执行 fast-forward-only pull，确认后可 commit/push。
4. 选择或输入 Obsidian vault 路径。
5. 配置 notes 目录策略：
   - `Auto`：推荐选项。配置中保存 `MEMO_NOTES_DIR="auto"`，表示 `$memo` 根据笔记内容选择 vault 内的目标相对路径。
   - `Custom folder`：用户输入固定 vault 相对目录，如 `Notes`、`Inbox`、`Projects/AI`。
6. 配置 assets 目录，提供默认值。
7. local 模式下，如果 vault 是 Git worktree，询问是否启用确认归档后的本地 commit。
8. remote 模式下，校验 Git worktree、remote、branch 和 `git pull --ff-only`。
9. 提供可选 skill 安装流程：Codex、Claude Code、暂时跳过。选择 Codex 或 Claude Code 时立即安装对应 skill；选择暂时跳过时只完成初始化。
10. 写入 `~/.config/memo/config`。

也保留非交互参数：

```sh
memo init --language zh-CN --mode local --vault /path/to/vault
memo init --language en --mode remote --vault /path/to/vault --remote origin --branch main
```

语言必须先选，因为后续错误提示、帮助信息和确认文案依赖语言。模式必须早于 Git 校验，因为 local 模式不要求 remote，也不执行 pull/push。

非交互初始化继续支持 `--notes-dir <dir>`。当调用方传入 `--notes-dir auto` 时，后续 `memo write` 必须由调用方提供目标路径；当传入具体目录时，CLI 按固定目录写入。

## CLI 命令

第一版 CLI 命令包括：

- `memo help`：展示全部命令、用途和示例。
- `memo init`：首次初始化或重新初始化。
- `memo install`：安装到 Codex、Claude Code 或所有支持平台。
- `memo info`：展示版本、语言、模式、vault、notes/assets 目录、安装目标和模式相关 Git 信息。
- `memo config`：修改语言、模式、vault、notes/assets 目录、本地 commit 偏好和已确认安装目标。
- `memo doctor`：按当前模式校验运行时可用性。
- `memo write`：写入或更新 draft，并复制附件。
- `memo status`：展示当前 draft、附件和模式相关状态。
- `memo commit`：用户确认归档后提交本次 draft 和附件。
- `memo push`：remote 模式下推送到配置的 remote 和 branch。

`memo config` 修改语言时不需要重新校验 vault；修改模式、vault、notes 目录或 assets 目录时必须复用 init/doctor 的校验逻辑。切换到 remote 模式时必须通过 Git 校验；切换到 local 模式时要清理或停用 remote-only 展示，避免 `memo info` 误导用户。

## 模式行为

local 模式：

- 校验 vault 存在、是目录、可写。
- 校验 notes/assets 目录可创建或可写。
- 不要求 Git worktree。
- 不校验 remote。
- 不执行 pull、push。
- 如果启用本地 commit，额外校验 vault 是可提交的 Git worktree。
- 用户确认归档后，启用本地 commit 则 commit，不启用则只保留本地文件。

remote 模式：

- 校验 vault 存在、是目录、可写。
- 校验 vault 是 Git worktree。
- 校验 remote 存在。
- 校验当前 branch 可识别。
- 初始化、doctor 和运行时写入前都使用 `git pull --ff-only`。
- 用户确认归档后 commit，并 push 到配置的 remote 和 branch。

这里的 Git worktree 指一个可工作的 Git checkout 目录。普通 `git clone` 得到的仓库目录就是 Git worktree，`git worktree add` 创建的附加目录也是 Git worktree。

## 运行时归档协议

`skill/SKILL.md` 必须把 `$memo` 的行为写成强制协议。

remote 模式流程：

1. 运行 `memo doctor --quiet`。
2. 执行 `git pull --ff-only`。
3. 根据用户请求生成 Markdown。
4. 确保 Markdown 包含 Obsidian YAML frontmatter。frontmatter 至少包含 `title`、`created`、`tags`、`status`，格式参考：

   ```markdown
   ---
   title: 标题
   created: 2026-07-06
   tags:
     - 标签1
     - 标签2
   status: 待确认
   ---
   ```

5. 如果 `MEMO_NOTES_DIR="auto"`，根据内容选择 vault-relative `.md` 目标路径并调用 `memo write --path <path>`；如果是固定目录，可继续调用 `memo write --title <title>`。
6. 调用 `memo write` 写入 draft 和附件。
7. 写入 session manifest。
8. 返回 draft 路径、附件路径和 Git diff 摘要。
9. 等待用户确认。
10. 用户要求修改时，更新同一份 draft。
11. 用户确认归档后，运行 `memo commit --message <message>`。
12. commit 成功后运行 `memo push`。
13. 用户放弃归档时，根据 manifest 删除本次会话创建的 draft 和附件，不 commit、不 push。

local 模式流程：

1. 运行 `memo doctor --quiet`。
2. 不执行 pull。
3. 根据用户请求生成 Markdown。
4. 确保 Markdown 包含 Obsidian YAML frontmatter：`title`、`created`、`tags`、`status`。
5. 如果 `MEMO_NOTES_DIR="auto"`，根据内容选择 vault-relative `.md` 目标路径并调用 `memo write --path <path>`；如果是固定目录，可继续调用 `memo write --title <title>`。
6. 调用 `memo write` 写入 draft 和附件。
7. 写入 session manifest。
8. 返回 draft 路径和附件路径。
9. 等待用户确认。
10. 用户要求修改时，更新同一份 draft。
11. 用户确认归档后，如果 `MEMO_LOCAL_GIT_COMMIT="enabled"`，运行本地 commit，但不 push。
12. 用户确认归档后，如果 `MEMO_LOCAL_GIT_COMMIT="disabled"`，只保留本地文件。
13. 用户放弃归档时，根据 manifest 删除本次会话创建的 draft 和附件，不 commit、不 push。

确认后才 commit 是第一版默认策略。这样未确认内容不会进入 Git 历史，用户多轮修改也不会产生多次草稿提交。

## Session Manifest

manifest 是一次 `$memo` 归档会话的临时索引，建议使用 shell 易读的键值格式或稳定 JSON。第一版如果主要由 shell 操作，优先使用简单键值格式，并避免需要额外 JSON 解析器。

manifest 至少记录：

- session id
- mode
- draft note absolute path
- draft note vault-relative path
- created attachment absolute paths
- attachment vault-relative paths
- archived flag
- abandoned flag
- created timestamp

放弃归档时只能删除 manifest 中记录的本次会话创建文件，不能按目录猜测删除。修改 draft 时要复用同一个 manifest，并追加记录替换过或不再引用的附件，确保放弃归档可以清理完整。

## 图片附件

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

Markdown 中使用从笔记文件到附件文件的相对链接：

```markdown
![image-1](../assets/2026/07/memo-skill-design/image-1.png)
```

写入顺序应保证原子性：先校验所有附件可读，再准备目标路径，再复制附件到临时或目标位置，最后写 Markdown。任一附件不可读或目标路径逃逸 vault 时，整个写入失败，不能留下半成品笔记。

remote 模式归档时，commit 必须同时包含 `.md` 文件和复制后的图片附件。local 模式启用本地 commit 时也同样包含本次 note 和附件。

## 错误处理

错误提示必须按当前语言输出，并说明卡在哪一步以及用户应该如何修复。

典型错误：

- 未初始化：提示运行 `memo init`。
- vault 不存在或不可写：提示选择有效 Obsidian vault。
- remote 模式但不是 Git worktree：解释普通 `git clone` 仓库目录就是 worktree，并提示配置 Git 仓库。
- remote 缺失：提示添加 remote，例如 `git remote add origin <url>`。
- branch 缺失：提示切换或创建 branch。
- `git pull --ff-only` 失败：提示先手动同步并解决冲突。
- 附件不可读：提示具体附件路径。
- 目标路径逃逸 vault：拒绝写入并提示检查 notes/assets 配置。

## 测试策略

CLI 和脚本测试应覆盖以下范围：

- `memo help` 展示全部命令。
- `memo info` 在 local/remote 模式下展示不同信息。
- `memo config` 修改语言、模式、vault、notes/assets 目录和本地 commit 偏好。
- `memo init` 的交互封装和非交互参数。
- local 模式下非 Git vault 成功。
- local 模式下启用本地 commit 时必须是可提交 Git worktree。
- remote 模式下非 Git worktree、缺 remote、缺 branch、pull 失败分别报错。
- `memo write` 标题 sanitize、路径安全、空内容失败、附件不可读失败。
- 修改 draft 时更新同一份文件和同一个 manifest。
- 用户确认前不 commit、不 push。
- remote 模式确认后 commit 并 push。
- local 模式启用本地 commit 后只 commit 不 push。
- 放弃归档根据 manifest 删除 draft 和附件。
- `memo install` 交互式多选和 `--target` 参数。
- npm 升级或平台安装不覆盖 `~/.config/memo/config`。

## 实施顺序

1. 创建 npm 包骨架、CLI dispatcher、i18n 和 prompt 封装。
2. 实现配置读写 helper 和 shell-safe quoting。
3. 实现 `memo help`、`memo info` 和 `memo doctor`。
4. 实现 `memo init` 的语言、模式、vault 和目录配置。
5. 实现 `memo config`，复用 init/doctor 校验。
6. 实现 `memo install` 的 Codex 目标和多选交互，再补 Claude Code 目标。
7. 实现 `memo write`、附件复制和 session manifest。
8. 实现 `memo status`、`memo commit` 和 `memo push`。
9. 编写 `skill/SKILL.md`，把运行时归档协议固化给 AI agent。
10. 补充 smoke tests 和模式相关集成测试。

## 需要重点守住的边界

- 任何运行时写入前都要确认 `MEMO_INITIALIZED="true"`。
- local 模式永远不能执行 remote 校验、pull 或 push。
- remote 模式写入前必须 fast-forward pull 成功。
- 用户确认归档前不能 commit 或 push。
- 放弃归档只能清理 manifest 记录的本次会话文件。
- session manifest 不能进入 Obsidian vault 或 Git commit。
- npm 包目录和平台 skill 目录不能存放用户 vault 配置。
- 所有目标路径必须校验仍在 vault 内。
