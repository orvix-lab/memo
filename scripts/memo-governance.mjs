#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const templateDir = path.join(root, 'templates', 'knowledge-base');
const requiredFiles = ['README.md', '知识库规范.md', 'knowledge-base.yml', '.memoignore'];
const requiredDirs = ['00-导航', '10-业务领域/催收与资产', '10-业务领域/支付与清结算', '10-业务领域/客户与授信', '20-项目', '30-方案与需求/PRD', '30-方案与需求/技术方案', '30-方案与需求/上线与提测', '40-技术沉淀/故障与排障', '40-技术沉淀/技术调研', '40-技术沉淀/工具与效率', '40-技术沉淀/AI工程', '90-收件箱', '99-归档', 'assets'];

function fail(message) { console.error(message); process.exit(1); }
function yamlList(text, name) {
  const match = text.match(new RegExp(`^${name}:\\n((?:  - .+\\n?)+)`, 'm'));
  return match ? [...match[1].matchAll(/^  - (.+)$/gm)].map((item) => item[1]) : [];
}
function frontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) fail('Managed knowledge note requires YAML frontmatter.');
  return match[1];
}
function field(data, name) { return data.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim(); }
function isIgnored(vault, relativePath) {
  const hardExcluded = ['知识库规范.md', 'knowledge-base.yml', '.memoignore', 'README.md'];
  if (hardExcluded.includes(relativePath) || relativePath.startsWith('.obsidian/') || relativePath.startsWith('assets/') || relativePath.startsWith('.')) return true;
  const lines = readFileSync(path.join(vault, '.memoignore'), 'utf8').split(/\\r?\\n/);
  let ignored = false;
  for (const raw of lines) {
    const rule = raw.trim();
    if (!rule || rule.startsWith('#')) continue;
    const negated = rule.startsWith('!');
    const source = negated ? rule.slice(1) : rule;
    const normalized = source.endsWith('/') ? `${source}**` : source;
    const pattern = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
    if (new RegExp(`^${pattern}$`).test(relativePath)) ignored = !negated;
  }
  return ignored;
}

function init(vault) {
  const results = [];
  for (const dir of requiredDirs) {
    const target = path.join(vault, dir);
    if (existsSync(target)) results.push(`kept directory: ${dir}`);
    else { mkdirSync(target, { recursive: true }); results.push(`created directory: ${dir}`); }
  }
  for (const name of requiredFiles) {
    const target = path.join(vault, name);
    if (existsSync(target)) results.push(`kept file: ${name}`);
    else { cpSync(path.join(templateDir, name), target); results.push(`created editable example: ${name}`); }
  }
  console.log(results.join('\n'));
  console.log('Review the editable governance examples before managed archiving.');
}

function validate(vault, file, targetPath) {
  for (const name of requiredFiles) if (!existsSync(path.join(vault, name))) fail(`Missing governance file: ${name}. Run memo init first.`);
  if (isIgnored(vault, targetPath)) fail(`Managed path is excluded by .memoignore: ${targetPath}`);
  const config = readFileSync(path.join(vault, 'knowledge-base.yml'), 'utf8');
  const content = readFileSync(file, 'utf8');
  const data = frontmatter(content);
  const required = yamlList(config, 'required_frontmatter');
  for (const name of required) if (!field(data, name)) fail(`Missing required frontmatter: ${name}`);
  const title = field(data, 'title');
  if (!content.match(new RegExp(`^# ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'))) fail('Frontmatter title must match the H1 heading.');
  const tags = data.match(/^tags:\n((?:  - .+\n?)+)/m)?.[1].match(/^  - .+$/gm) ?? [];
  if (tags.length < 3 || tags.length > 8) fail('Managed knowledge note requires 3 to 8 tags.');
  for (const heading of ['结论', '适用范围', '核心内容', '关键检索词', '关联文档', '来源与验证']) if (!content.includes(`## ${heading}`)) fail(`Missing required section: ${heading}`);
  if (!targetPath.startsWith('00-导航/') && !targetPath.startsWith('10-业务领域/') && !targetPath.startsWith('20-项目/') && !targetPath.startsWith('30-方案与需求/') && !targetPath.startsWith('40-技术沉淀/') && !targetPath.startsWith('90-收件箱/') && !targetPath.startsWith('99-归档/')) fail('Managed knowledge path must use a governed top-level directory.');
}

const [command, ...args] = process.argv.slice(2);
if (command === 'init' && args.length === 1) init(path.resolve(args[0]));
else if (command === 'validate' && args.length === 3) validate(path.resolve(args[0]), path.resolve(args[1]), args[2]);
else fail('Usage: memo-governance.mjs init <vault> | validate <vault> <content-file> <vault-relative-path>');
