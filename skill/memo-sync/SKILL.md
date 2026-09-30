---
name: memo-sync
description: 手动确认后将当前或指定 OpenSpec change 同步到配置的 Obsidian Vault。
---

# memo-sync

当用户调用 `/memo-sync [change-name]` 时，将 OpenSpec change 的当前稳定状态单向同步到 Memo 管理的 Vault 镜像。此 Skill 不启动 Watcher，不自动监听 Kiro、Cursor 或文件系统保存事件。

## 事实源与边界

- `openspec/changes/<change-name>/` 是唯一可编辑事实源。
- Vault 镜像位于 `30-方案与需求/openspec/<change-name>/`，只由 `memo spec sync` 更新。
- 不直接编辑镜像中的 `proposal.md`、`design.md`、`tasks.md` 或 `specs/`；个人补充仅写入 `notes.md`。
- 每次同步均需用户明确请求和确认；不同编辑器的中间保存不会自动触发同步。

## 目标解析

按以下优先级确定 change，任一步不能唯一确定时停止并让用户选择：

1. 用户提供了 `<change-name>`：校验并使用该名称。
2. 当前活动文件位于 `openspec/changes/<change-name>/`：从路径解析名称。
3. 当前 Agent 会话已绑定一个 OpenSpec change：使用该 change。
4. `openspec list --json` 只返回一个 in-progress change：使用该 change。

不得根据标题相似度、最近修改时间或 Vault 镜像内容猜测 change；有多个候选时列出候选名称后等待用户指定。

## 同步流程

1. 运行 `memo doctor --quiet`；失败时说明初始化或 Vault 问题，不直接写入 Vault。
2. 展示已解析 change、OpenSpec 来源路径、当前工件状态、任务完成数、目标镜像路径和将更新的文件。
3. 等待用户明确确认同步范围。
4. 用户确认且 Kiro/Cursor 运行时授予写权限后执行：

```sh
memo spec sync --change <change-name> --from-path <openspec-root>
```

5. 报告镜像路径、`spec_stage`、规划工件完成度、任务进度和同步时间。

## 安全规则

- 不自动 commit 或 push。
- 不修改 OpenSpec 源文件。
- 不覆盖 `notes.md`。
- 同步失败时保留上一份完整镜像并报告错误。
- OpenSpec Skill 修改文件后只能提示用户运行 `/memo-sync [change-name]`，不得自行同步。
