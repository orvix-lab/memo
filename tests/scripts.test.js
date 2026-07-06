import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const memoBin = path.join(repoRoot, 'bin', 'memo');

function makeTempRoot() {
  return mkdtempSync(path.join(tmpdir(), 'memo-test-'));
}

function runMemo(root, args = [], options = {}) {
  return spawnSync(process.execPath, [memoBin, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: path.join(root, 'home'),
      MEMO_HOME: path.join(root, 'memo-home'),
      ...options.env,
    },
  });
}

function makeVault(root, name = 'vault') {
  const vault = path.join(root, name);
  mkdirSync(vault, { recursive: true });
  return vault;
}

function git(root, args) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Memo Test',
      GIT_AUTHOR_EMAIL: 'memo@example.test',
      GIT_COMMITTER_NAME: 'Memo Test',
      GIT_COMMITTER_EMAIL: 'memo@example.test',
    },
  });
}

test('doctor fails before memo is initialized', () => {
  const root = makeTempRoot();
  const result = runMemo(root, ['doctor']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /memo init/);
});

test('local init and doctor succeed for a non-git vault', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);

  const init = runMemo(root, [
    'init',
    '--language',
    'en',
    '--mode',
    'local',
    '--vault',
    vault,
    '--notes-dir',
    'Notes',
    '--assets-dir',
    'assets',
    '--local-git-commit',
    'disabled',
  ]);
  assert.equal(init.status, 0, init.stderr);

  const doctor = runMemo(root, ['doctor', '--quiet']);
  assert.equal(doctor.status, 0, doctor.stderr);

  const config = readFileSync(path.join(root, 'memo-home', 'config'), 'utf8');
  assert.match(config, /MEMO_LANGUAGE='en'/);
  assert.match(config, /MEMO_MODE='local'/);
  assert.match(config, /MEMO_INITIALIZED='true'/);
});

test('local commit preference requires a git worktree', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);

  const result = runMemo(root, [
    'init',
    '--language',
    'en',
    '--mode',
    'local',
    '--vault',
    vault,
    '--local-git-commit',
    'enabled',
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Git worktree/);
});

test('remote init rejects a non-git vault with worktree guidance', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);

  const result = runMemo(root, [
    'init',
    '--language',
    'en',
    '--mode',
    'remote',
    '--vault',
    vault,
    '--remote',
    'origin',
    '--branch',
    'main',
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Git worktree/);
  assert.match(result.stderr, /git clone/);
});

test('remote init rejects a git vault without the configured remote', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(git(vault, ['init']).status, 0);
  assert.equal(git(vault, ['checkout', '-b', 'main']).status, 0);

  const result = runMemo(root, [
    'init',
    '--language',
    'en',
    '--mode',
    'remote',
    '--vault',
    vault,
    '--remote',
    'origin',
    '--branch',
    'main',
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /remote/);
});

test('info reports local mode without remote operations', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  const init = runMemo(root, [
    'init',
    '--language',
    'en',
    '--mode',
    'local',
    '--vault',
    vault,
  ]);
  assert.equal(init.status, 0, init.stderr);

  const info = runMemo(root, ['info']);

  assert.equal(info.status, 0, info.stderr);
  assert.match(info.stdout, /Mode: local/);
  assert.match(info.stdout, /Remote sync: disabled/);
  assert.doesNotMatch(info.stdout, /Git remote:/);
});

test('config updates language while preserving vault settings', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);

  const configResult = runMemo(root, ['config', '--language', 'zh-CN']);
  assert.equal(configResult.status, 0, configResult.stderr);

  const config = readFileSync(path.join(root, 'memo-home', 'config'), 'utf8');
  assert.match(config, /MEMO_LANGUAGE='zh-CN'/);
  const realVault = realpathSync(vault);
  assert.match(config, new RegExp(`MEMO_VAULT='${realVault.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  assert.match(config, /MEMO_MODE='local'/);
});

test('config rejects enabling local commit outside a git worktree', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);

  const result = runMemo(root, ['config', '--local-git-commit', 'enabled']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Git worktree/);
});

test('install codex copies skill files and preserves user config', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  const codexHome = path.join(root, 'codex-home');
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);
  const before = readFileSync(path.join(root, 'memo-home', 'config'), 'utf8');

  const result = runMemo(root, ['install', '--target', 'codex'], {
    env: { CODEX_HOME: codexHome },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(path.join(codexHome, 'skills', 'memo', 'SKILL.md')), true);
  assert.equal(existsSync(path.join(codexHome, 'skills', 'memo', 'metadata.json')), true);

  const after = readFileSync(path.join(root, 'memo-home', 'config'), 'utf8');
  assert.match(after, /MEMO_CONFIRMED_INSTALL_TARGETS='codex'/);
  assert.match(after, /MEMO_VAULT='/);
  assert.notEqual(after, '');
  assert.match(before, /MEMO_VAULT='/);
});
