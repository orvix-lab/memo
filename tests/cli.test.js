import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
