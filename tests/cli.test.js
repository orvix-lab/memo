import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const memoBin = path.join(repoRoot, 'bin', 'memo');

function runMemo(args = [], options = {}) {
  return spawnSync(process.execPath, [memoBin, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function runMemoWithHome(root, args = []) {
  return spawnSync(process.execPath, [memoBin, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: `${root}/home`,
      MEMO_HOME: `${root}/memo-home`,
    },
  });
}

const commands = [
  'init',
  'config',
  'doctor',
  'install',
  'write',
  'status',
  'info',
  'commit',
  'push',
  'help',
];

test('memo without arguments prints help with all commands', () => {
  const result = runMemo();

  assert.equal(result.status, 0, result.stderr);
  for (const command of commands) {
    assert.match(result.stdout, new RegExp(`\\b${command}\\b`));
  }
});

test('memo --help prints help with all commands', () => {
  const result = runMemo(['--help']);

  assert.equal(result.status, 0, result.stderr);
  for (const command of commands) {
    assert.match(result.stdout, new RegExp(`\\b${command}\\b`));
  }
});

test('memo help prints help with all commands', () => {
  const result = runMemo(['help']);

  assert.equal(result.status, 0, result.stderr);
  for (const command of commands) {
    assert.match(result.stdout, new RegExp(`\\b${command}\\b`));
  }
});

test('unknown commands fail with a useful error', () => {
  const result = runMemo(['unknown-command']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown command: unknown-command/);
});

test('skill metadata exposes memo and runtime protocol covers confirmation gates', () => {
  const metadata = JSON.parse(readFileSync(path.join(repoRoot, 'skill', 'metadata.json'), 'utf8'));
  const skill = readFileSync(path.join(repoRoot, 'skill', 'SKILL.md'), 'utf8');

  assert.equal(metadata.name, 'memo');
  assert.match(skill, /memo doctor --quiet/);
  assert.match(skill, /remote mode/i);
  assert.match(skill, /local mode/i);
  assert.match(skill, /memo write/);
  assert.match(skill, /same session/i);
  assert.match(skill, /explicit confirmation/i);
  assert.match(skill, /memo commit --session/);
  assert.match(skill, /memo push/);
  assert.match(skill, /--abandon/);
  assert.match(skill, /Do not commit or push/i);
});

test('help uses persisted language preference after init', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'memo-cli-test-'));
  const vault = path.join(root, 'vault');
  mkdirSync(vault, { recursive: true });
  const init = runMemoWithHome(root, ['init', '--language', 'zh-CN', '--mode', 'local', '--vault', vault]);
  assert.equal(init.status, 0, init.stderr);

  const help = runMemoWithHome(root, ['help']);

  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /用法/);
  assert.match(help.stdout, /命令/);
});
