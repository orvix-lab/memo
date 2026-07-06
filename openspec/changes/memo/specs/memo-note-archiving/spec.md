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

### Requirement: Auto 笔记目录要求调用方提供目标路径
当配置的 notes directory 为 `auto` 时，CLI SHALL 要求 `memo write` 调用方提供 vault-relative `.md` 目标路径，并拒绝缺少目标路径的写入。

#### Scenario: Auto 模式提供目标路径
- **WHEN** 配置中 `MEMO_NOTES_DIR` 为 `auto` 且调用方运行 `memo write --path "项目调研/开源营销系统选型分析.md"`
- **THEN** CLI 将笔记写入 vault 内该相对路径

#### Scenario: Auto 模式缺少目标路径
- **WHEN** 配置中 `MEMO_NOTES_DIR` 为 `auto` 且调用方只提供 title
- **THEN** CLI 拒绝写入并提示需要 `--path`

### Requirement: 笔记内容包含 Obsidian 属性
`$memo` skill 工作流 SHALL 生成包含 Obsidian YAML frontmatter 的 Markdown 笔记，至少包含 `title`、`created`、`tags`、`status`。

#### Scenario: skill 写入新笔记
- **WHEN** `$memo` 根据用户内容生成 Markdown
- **THEN** Markdown 以 YAML frontmatter 开头
- **AND** frontmatter 包含 title、created、tags、status 字段

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
- **THEN** skill 不运行 commit 或 push

### Requirement: 本地模式不执行远端归档
`$memo` skill 工作流 SHALL 在本地模式下跳过 pull、push 和 remote 同步操作。

#### Scenario: 本地模式用户确认完成
- **WHEN** 本地模式下笔记已经写入且用户确认内容完成
- **THEN** skill 报告本地文件路径和附件路径，不执行 push

### Requirement: 本地模式支持确认后本地 commit
`$memo` skill 工作流 SHALL 在本地模式启用本地 commit 偏好时，于用户确认笔记内容后执行本地 commit，但不得执行 push。

#### Scenario: 本地 commit 已启用
- **WHEN** 本地模式下笔记已经写入、配置启用了本地 commit，且用户确认内容完成
- **THEN** skill 运行 `memo commit --message <message>` 并且不运行 `memo push`

#### Scenario: 本地 commit 已禁用
- **WHEN** 本地模式下笔记已经写入、配置禁用了本地 commit，且用户确认内容完成
- **THEN** skill 不运行 commit 或 push，只报告本地文件路径和附件路径

### Requirement: 远端模式归档包含笔记和附件变更
commit 命令 SHALL 在远端模式下同时包含 Markdown 笔记变更和该笔记创建的附件文件。

#### Scenario: 笔记包含附件
- **WHEN** 用户确认归档一篇带图片的笔记
- **THEN** commit 中包含 `.md` 文件和所有复制后的图片文件
