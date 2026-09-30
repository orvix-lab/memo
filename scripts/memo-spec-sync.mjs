#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

function fail(message) { console.error(message); process.exit(1); }
function hash(content) { return createHash('sha256').update(content).digest('hex'); }
function quote(value) { return JSON.stringify(String(value)); }
function walkMarkdown(directory, prefix = '') {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    const source = join(directory, entry.name);
    if (entry.isDirectory()) return walkMarkdown(source, nextPrefix);
    return entry.isFile() && entry.name.endsWith('.md') ? [{ source, relative: nextPrefix }] : [];
  });
}
function resolveChange(sourcePath, change) {
  const source = resolve(sourcePath);
  const candidates = [
    join(source, 'changes', change),
    join(source, change),
    basename(source) === change ? source : '',
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isDirectory());
  if (!found) fail(`OpenSpec change not found: ${change} under ${source}`);
  return found;
}
function taskCounts(tasksPath) {
  if (!existsSync(tasksPath)) return { total: 0, completed: 0 };
  const lines = readFileSync(tasksPath, 'utf8').split(/\r?\n/);
  const tasks = lines.filter((line) => /^- \[[^\]]*\] /.test(line));
  return { total: tasks.length, completed: tasks.filter((line) => /^- \[[xX]\] /.test(line)).length };
}
function stage(artifacts, tasks, archived) {
  if (archived) return '已归档';
  if (artifacts.complete < artifacts.total) return '规划中';
  if (tasks.total === 0 || tasks.completed === 0) return '待实施';
  if (tasks.completed < tasks.total) return '实施中';
  return '待归档';
}
function artifactSummary(changeRoot) {
  const names = ['proposal.md', 'design.md', 'tasks.md'];
  const specs = walkMarkdown(join(changeRoot, 'specs'));
  const present = names.filter((name) => existsSync(join(changeRoot, name))).length + (specs.length ? 1 : 0);
  return { total: 4, complete: present, specs };
}
function copyArtifacts(changeRoot, target) {
  const copied = [];
  for (const name of ['proposal.md', 'design.md', 'tasks.md']) {
    const source = join(changeRoot, name);
    if (!existsSync(source)) continue;
    const destination = join(target, name);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination);
    copied.push({ path: name, sha256: hash(readFileSync(source)) });
  }
  for (const item of walkMarkdown(join(changeRoot, 'specs'))) {
    const destination = join(target, 'specs', item.relative);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(item.source, destination);
    copied.push({ path: `specs/${item.relative}`, sha256: hash(readFileSync(item.source)) });
  }
  return copied;
}
function main(vault, change, sourcePath) {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(change)) fail(`Invalid change name: ${change}`);
  const changeRoot = resolveChange(sourcePath, change);
  const artifacts = artifactSummary(changeRoot);
  const tasks = taskCounts(join(changeRoot, 'tasks.md'));
  const archived = changeRoot.includes(`${sep}archive${sep}`);
  const specStage = stage(artifacts, tasks, archived);
  const targetRoot = join(resolve(vault), '30-方案与需求', 'openspec', change);
  const parent = dirname(targetRoot);
  mkdirSync(parent, { recursive: true });
  const temp = mkdtempSync(join(parent, `.${change}.sync-`));
  try {
    const copied = copyArtifacts(changeRoot, temp);
    const notes = join(targetRoot, 'notes.md');
    if (existsSync(notes)) cpSync(notes, join(temp, 'notes.md'));
    const sourceRelative = relative(process.cwd(), changeRoot) || '.';
    const syncedAt = new Date().toISOString();
    const state = { version: 1, change, source: sourceRelative, syncedAt, stage: specStage, artifacts, tasks, files: copied };
    const readme = `---\ntitle: ${quote(change)}\ncreated: ${quote(syncedAt.slice(0, 10))}\nupdated: ${quote(syncedAt.slice(0, 10))}\ntype: 技术方案\ndomain: 平台工程\nproject: []\ntags:\n  - OpenSpec\n  - Memo同步\n  - Spec管理\nstatus: 已确认\nsummary: ${quote(`OpenSpec change ${change} 的受控镜像与状态摘要。`)}\nspec_id: ${quote(change)}\nspec_display_name: ${quote(change)}\nspec_source: ${quote(sourceRelative)}\nspec_sync_state: 已同步\nspec_sync_at: ${quote(syncedAt)}\nspec_stage: ${quote(specStage)}\nspec_artifacts_total: ${artifacts.total}\nspec_artifacts_complete: ${artifacts.complete}\nspec_tasks_total: ${tasks.total}\nspec_tasks_completed: ${tasks.completed}\n---\n\n# ${change}\n\n> 本目录由 \`memo spec sync\` 根据 OpenSpec 单向生成。请在 OpenSpec 源目录编辑 proposal、design、tasks 和 specs；个人补充请写入 [[notes.md]]。\n\n## 当前状态\n\n- 阶段：${specStage}\n- 规划工件：${artifacts.complete}/${artifacts.total}\n- 任务进度：${tasks.completed}/${tasks.total}\n- 最近同步：${syncedAt}\n\n## 同步工件\n\n${copied.map((file) => `- [[${file.path}]]`).join('\n') || '- 尚无可同步工件'}\n`;
    writeFileSync(join(temp, 'README.md'), readme);
    writeFileSync(join(temp, 'sync-state.json'), `${JSON.stringify(state, null, 2)}\n`);
    const backup = `${targetRoot}.previous-${process.pid}`;
    if (existsSync(targetRoot)) renameSync(targetRoot, backup);
    try { renameSync(temp, targetRoot); } catch (error) { if (existsSync(backup)) renameSync(backup, targetRoot); throw error; }
    if (existsSync(backup)) rmSync(backup, { recursive: true, force: true });
    console.log(`Synced OpenSpec change: ${change}`);
    console.log(`Mirror: ${targetRoot}`);
    console.log(`Stage: ${specStage}`);
    console.log(`Tasks: ${tasks.completed}/${tasks.total}`);
  } catch (error) {
    if (existsSync(temp)) rmSync(temp, { recursive: true, force: true });
    throw error;
  }
}

const [vault, change, sourcePath] = process.argv.slice(2);
if (!vault || !change || !sourcePath) fail('Usage: memo-spec-sync.mjs <vault> <change> <openspec-root-or-change-dir>');
main(vault, change, sourcePath);
