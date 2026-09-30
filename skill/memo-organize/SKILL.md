---
name: memo-organize
description: 按当前 Obsidian Vault 的知识库规则预览并受控整理指定文件或目录。
---

# memo-organize

当用户调用 `/memo-organize <文件或目录>` 时，依据当前 Memo 配置的 Vault 规则分析指定范围内的历史 Markdown 笔记。该 Skill 是对话入口；不接受或暴露面向用户的 `memo organize` 终端命令。

## 必经流程

1. 运行 `memo doctor --quiet`，失败时按 `/memo` 的同步与修复流程处理；不得直接写入 Vault。
2. 运行 `memo info` 确认 Vault 根目录，并读取根目录的 `知识库规范.md`、`knowledge-base.yml` 和 `.memoignore`。
3. 将用户参数解析为 Vault 内的单个 Markdown 文件或目录；拒绝绝对路径、`..`、Vault 外路径和不存在的目标。
4. 仅扫描指定范围内、未被 `.memoignore` 排除的 Markdown 笔记。始终跳过：`README.md`、`知识库规范.md`、`knowledge-base.yml`、`.memoignore`、`.obsidian/`、所有隐藏文件、`assets/` 与非 Markdown 文件。
5. 对每篇候选笔记提供预览：当前路径、建议主路径、Frontmatter/正文缺失项、重复候选、内部链接与 README 清单影响；同时报告跳过的文件及原因。
6. 展示整理预览后，请用户明确确认本次**写入授权范围**：将修改的笔记路径、计划移动/重命名、元数据补齐、链接更新、README 清单更新，以及是否允许 Git 提交必须逐项列出。用户仅确认预览、分析或“继续看看”不构成写入授权。
7. 用户确认后，在已批准范围内调用可用的受控写入能力执行整理。每次实际写入、移动或删除仍必须让 Kiro 的运行时权限机制向用户请求授权；如果用户拒绝或运行时未授予权限，立即停止，保留预览并说明未执行的操作。
8. `README.md` 只允许更新 `MEMO-MANAGED-INVENTORY` 标记区块。大规模改写、主题合并、删除文件、Git 提交/推送或范围外影响必须单独再次请求确认。

## 安全边界

- `.memoignore` 规则不可由 Prompt 参数绕过。
- 不整理或改写治理、配置、隐藏和资源文件。
- Skill 不得自行提升写入或 MCP 权限；必须先说明影响范围并取得用户明确授权，再由 Kiro 运行时处理实际工具写权限请求。
- 不自动提交或推送；仍遵守 `/memo` 的显式确认门禁。
- 若底层受控整理能力尚不可用，只能输出预览和缺失能力说明，不能尝试直接操作文件系统。
