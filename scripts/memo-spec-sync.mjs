#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

function fail(message) { console.error(message); process.exit(1); }
function hash(content) { return createHash('sha256').update(content).digest('hex'); }
function quote(value) { return JSON.stringify(String(value)); }
function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  return trimmed;
}
function sectionBody(content, titles) {
  if (!content) return '';
  const escaped = titles.map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const heading = content.match(new RegExp(`^##\\s+(?:${escaped.join('|')})\\s*$`, 'm'));
  if (!heading || heading.index === undefined) return '';
  const remainder = content.slice(heading.index + heading[0].length);
  const nextHeading = remainder.search(/^##\s/m);
  const section = nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder;
  return section.replace(/<!--[^]*?-->/g, '').trim();
}
function plain(text) {
  return text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
}
function paragraphs(section) {
  return section.split(/\r?\n\s*\r?\n/).map((part) => plain(part.replace(/^[-*]\s+/gm, ''))).filter(Boolean);
}
function proseParagraphs(section) {
  return paragraphs(section).filter((paragraph) => !/[：:]\s*$/.test(paragraph) && (paragraph.match(/[：:]/g) || []).length < 3);
}
function finish(text) {
  const normalized = plain(text);
  if (!normalized) return '';
  return /[。！？.!?]$/.test(normalized) ? normalized : `${normalized}。`;
}
function cap(text, max) {
  const normalized = plain(text);
  if (!normalized || normalized.length <= max) return normalized;
  const sliced = normalized.slice(0, max);
  const boundary = Math.max(sliced.lastIndexOf('。'), sliced.lastIndexOf('；'), sliced.lastIndexOf('，'));
  const cut = boundary >= 24 ? sliced.slice(0, boundary + 1) : sliced;
  return /[。！？.!?；;，,]$/.test(cut) ? cut : `${cut}。`;
}
function designGoals(design) {
  const section = sectionBody(design, ['目标 / 非目标', '目标与非目标', 'Goals / Non-Goals', '目标', 'Goals']);
  if (!section) return [];
  const goalPart = section.split(/\*\*非目标[:：]?\*\*|\*\*Non-Goals[:：]?\*\*/i)[0];
  return goalPart.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => plain(line.replace(/^[-*]\s+/, '')).replace(/[。！？.!?]+$/, ''))
    .filter((line) => line && !/^(目标|Goals)[:：]?$/.test(line));
}
function summarizeDocuments(proposalContent, designContent) {
  const why = sectionBody(proposalContent, ['为什么', 'Why']);
  const prose = proseParagraphs(why);
  const intent = prose.find((paragraph) => /^本次/.test(paragraph));
  const goals = designGoals(designContent);
  if (intent) return cap(finish(intent), 180);
  const thereforeSource = prose.find((paragraph) => paragraph.includes('因此'));
  const goalText = goals.slice(0, 2).map((goal) => finish(goal)).join('');
  if (thereforeSource && goals[0]) {
    const therefore = thereforeSource.slice(thereforeSource.lastIndexOf('因此')).replace(/^因此需要/, '').replace(/^因此/, '').trim();
    return cap(`${finish(therefore).replace(/。$/, '')}，${goals[0]}。`, 180);
  }
  if (thereforeSource) return cap(finish(thereforeSource), 180);
  if (goalText) return cap(goalText, 180);
  if (prose[0]) return cap(finish(prose[0]), 180);
  const changeParagraph = proseParagraphs(sectionBody(proposalContent, ['变更内容', 'What Changes']))[0];
  if (changeParagraph) return cap(finish(changeParagraph), 180);
  return '未声明';
}
function proposalContext(proposalPath, designPath = '') {
  if (!existsSync(proposalPath)) return { summary: '未声明', projects: [], projectNames: '未声明', projectBranches: '未声明' };
  const content = readFileSync(proposalPath, 'utf8');
  const designContent = designPath && existsSync(designPath) ? readFileSync(designPath, 'utf8') : '';
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  let summary = '';
  const projects = [];
  if (frontmatter) {
    let inMemo = false;
    let inProjects = false;
    let currentProject = null;
    for (const line of frontmatter[1].split(/\r?\n/)) {
      if (line === 'memo:') { inMemo = true; inProjects = false; continue; }
      if (inMemo && /^[^\s]/.test(line) && line.trim()) break;
      if (!inMemo) continue;
      const summaryMatch = line.match(/^  summary:\s*(.+)$/);
      if (summaryMatch) { summary = unquote(summaryMatch[1]); continue; }
      if (/^  projects:\s*$/.test(line)) { inProjects = true; continue; }
      if (!inProjects) continue;
      const projectMatch = line.match(/^    - name:\s*(.+)$/);
      if (projectMatch) {
        currentProject = { name: unquote(projectMatch[1]), branch: '未声明' };
        projects.push(currentProject);
        continue;
      }
      const branchMatch = line.match(/^      branch:\s*(.+)$/);
      if (branchMatch && currentProject) currentProject.branch = unquote(branchMatch[1]) || '未声明';
    }
  }
  const resolvedSummary = summary || summarizeDocuments(content, designContent);
  const validProjects = projects.filter((project) => project.name);
  return {
    summary: resolvedSummary || '未声明',
    projects: validProjects,
    projectNames: validProjects.length ? validProjects.map((project) => project.name).join('、') : '未声明',
    projectBranches: validProjects.length ? validProjects.map((project) => `${project.name} → ${project.branch || '未声明'}`).join('；') : '未声明',
  };
}
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
  const candidates = [join(source, 'changes', change), join(source, change), basename(source) === change ? source : ''].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isDirectory());
  if (!found) fail(`OpenSpec change not found: ${change} under ${source}`);
  return found;
}
function taskCounts(tasksPath) {
  if (!existsSync(tasksPath)) return { total: 0, completed: 0 };
  const tasks = readFileSync(tasksPath, 'utf8').split(/\r?\n/).filter((line) => /^- \[[^\]]*\] /.test(line));
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
function yamlProjects(projects) {
  return projects.length ? `project:\n${projects.map((project) => `  - ${project.name}`).join('\n')}` : 'project: []';
}
function main(vault, change, sourcePath) {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(change)) fail(`Invalid change name: ${change}`);
  const changeRoot = resolveChange(sourcePath, change);
  const artifacts = artifactSummary(changeRoot);
  const tasks = taskCounts(join(changeRoot, 'tasks.md'));
  const context = proposalContext(join(changeRoot, 'proposal.md'), join(changeRoot, 'design.md'));
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
    const state = { version: 1, change, source: sourceRelative, syncedAt, stage: specStage, summary: context.summary, projects: context.projects, projectNames: context.projectNames, projectBranches: context.projectBranches, artifacts, tasks, files: copied };
    const readme = `---\ntitle: ${quote(change)}\ncreated: ${quote(syncedAt.slice(0, 10))}\nupdated: ${quote(syncedAt.slice(0, 10))}\ntype: 技术方案\ndomain: 平台工程\n${yamlProjects(context.projects)}\ntags:\n  - OpenSpec\n  - Memo同步\n  - Spec管理\nstatus: 已确认\nsummary: ${quote(`OpenSpec change ${change} 的受控镜像与状态摘要。`)}\nspec_id: ${quote(change)}\nspec_display_name: ${quote(change)}\nspec_source: ${quote(sourceRelative)}\nspec_sync_state: 已同步\nspec_sync_at: ${quote(syncedAt)}\nspec_stage: ${quote(specStage)}\nspec_artifacts_total: ${artifacts.total}\nspec_artifacts_complete: ${artifacts.complete}\nspec_tasks_total: ${tasks.total}\nspec_tasks_completed: ${tasks.completed}\nspec_summary: ${quote(context.summary)}\nspec_projects: ${quote(context.projectNames)}\nspec_project_branches: ${quote(context.projectBranches)}\n---\n\n# ${change}\n\n> 本目录由 \`memo spec sync\` 根据 OpenSpec 单向生成。请在 OpenSpec 源目录编辑 proposal、design、tasks 和 specs；个人补充请写入 [[notes.md]]。\n\n## 当前状态\n\n- 任务摘要：${context.summary}\n- 涉及项目：${context.projectNames}\n- 项目与分支：${context.projectBranches}\n- 阶段：${specStage}\n- 规划工件：${artifacts.complete}/${artifacts.total}\n- 任务进度：${tasks.completed}/${tasks.total}\n- 最近同步：${syncedAt}\n\n## 同步工件\n\n${copied.map((file) => `- [[${file.path}]]`).join('\n') || '- 尚无可同步工件'}\n`;
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

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  const [vault, change, sourcePath] = process.argv.slice(2);
  if (!vault || !change || !sourcePath) fail('Usage: memo-spec-sync.mjs <vault> <change> <openspec-root-or-change-dir>');
  main(vault, change, sourcePath);
}

export { summarizeDocuments };
