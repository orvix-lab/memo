---
name: memo-spec-sync
description: 将 OpenSpec change 单向同步到配置的 Obsidian Vault，并展示 Spec 工件与任务状态。
---

# memo-spec-sync

当用户调用 `/memo-spec-sync <change-name>`，或希望查看、刷新 OpenSpec 到 Memo 的镜像状态时使用。

## 事实源与边界

- `openspec/changes/<change-name>/` 是唯一可编辑事实源。
- Vault 镜像位于 `30-方案与需求/openspec/<change-name>/`，只能由 `memo spec sync` 更新。
- 不在镜像的 proposal、design、tasks 或 specs 文件中直接编辑；个人补充写入 `notes.md`。
- 同步不修改 OpenSpec 源文件，不自动 commit 或 push。

## 流程

1. 运行 `memo doctor --quiet`；失败时说明初始化或 Vault 问题，不直接写入 Vault。
2. 确认 change 名称仅包含小写字母、数字和连字符，并定位其 OpenSpec 根目录。
3. 先运行或准备展示以下同步范围：proposal、design、tasks、specs、镜像 README、`sync-state.json`；说明当前工件完成度、任务完成数和推导阶段。
4. 请求用户明确确认 Vault 写入范围。
5. 确认后运行：

```sh
memo spec sync --change <change-name> --from-path <openspec-root>
```

6. 报告镜像路径、阶段、任务进度和最后同步时间。
7. 若 Kiro 请求文件写权限，必须由用户在运行时批准；拒绝时停止并保留已有镜像。

## 状态含义

- `规划中`：proposal、specs、design、tasks 未完整。
- `待实施`：规划完整，任务尚未完成。
- `实施中`：任务部分完成。
- `待归档`：任务全部完成。
- `已归档`：OpenSpec 已归档。
- `同步异常`：最近同步失败，需查看错误后重试。
