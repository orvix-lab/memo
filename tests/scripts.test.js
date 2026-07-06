import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const memoBin = path.join(repoRoot, 'bin', 'memo');
const attachmentFixture = path.join(repoRoot, 'tests', 'fixtures', 'attachments', 'image-1.png');

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

test('write creates a sanitized draft, copies attachments, and records manifest', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);
  const contentFile = path.join(root, 'content.md');
  writeFileSync(contentFile, '# Memo Title\n\nBody text.\n');

  const result = runMemo(root, [
    'write',
    '--session',
    'session-a',
    '--title',
    'Memo Title!',
    '--content-file',
    contentFile,
    '--attachment',
    attachmentFixture,
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Session: session-a/);
  assert.match(result.stdout, /Draft:/);

  const note = path.join(vault, 'Notes', `${new Date().toISOString().slice(0, 10)}-memo-title.md`);
  assert.equal(existsSync(note), true);
  const noteText = readFileSync(note, 'utf8');
  assert.match(noteText, /Body text/);
  assert.match(noteText, /!\[image-1\]\(\.\.\/assets\/\d{4}\/\d{2}\/memo-title\/image-1\.png\)/);

  const manifest = readFileSync(path.join(root, 'memo-home', 'state', 'sessions', 'session-a.manifest'), 'utf8');
  assert.match(manifest, /SESSION_ID='session-a'/);
  assert.match(manifest, /DRAFT_REL='Notes\//);
  assert.match(manifest, /ATTACHMENT_COUNT='1'/);
});

test('write updates the same draft for the same session', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);
  const first = path.join(root, 'first.md');
  const second = path.join(root, 'second.md');
  writeFileSync(first, 'first body\n');
  writeFileSync(second, 'second body\n');

  assert.equal(runMemo(root, ['write', '--session', 'session-b', '--title', 'Same Draft', '--content-file', first]).status, 0);
  assert.equal(runMemo(root, ['write', '--session', 'session-b', '--title', 'Changed Title', '--content-file', second]).status, 0);

  const note = path.join(vault, 'Notes', `${new Date().toISOString().slice(0, 10)}-same-draft.md`);
  assert.equal(readFileSync(note, 'utf8'), 'second body\n');
});

test('write rejects empty content without creating a draft', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);
  const contentFile = path.join(root, 'empty.md');
  writeFileSync(contentFile, '');

  const result = runMemo(root, ['write', '--session', 'empty-session', '--title', 'Empty', '--content-file', contentFile]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /content is empty/);
  assert.equal(existsSync(path.join(vault, 'Notes', `${new Date().toISOString().slice(0, 10)}-empty.md`)), false);
});

test('status reports current draft and local mode', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);
  const contentFile = path.join(root, 'status.md');
  writeFileSync(contentFile, 'status body\n');
  assert.equal(runMemo(root, ['write', '--session', 'status-session', '--title', 'Status Note', '--content-file', contentFile]).status, 0);

  const result = runMemo(root, ['status', '--session', 'status-session']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Mode: local/);
  assert.match(result.stdout, /Draft:/);
  assert.doesNotMatch(result.stdout, /push/);
});

test('local commit enabled commits confirmed draft and attachments', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(git(vault, ['init']).status, 0);
  assert.equal(git(vault, ['checkout', '-b', 'main']).status, 0);
  assert.equal(runMemo(root, [
    'init',
    '--language',
    'en',
    '--mode',
    'local',
    '--vault',
    vault,
    '--local-git-commit',
    'enabled',
  ]).status, 0);
  const contentFile = path.join(root, 'commit.md');
  writeFileSync(contentFile, 'commit body\n');
  assert.equal(runMemo(root, [
    'write',
    '--session',
    'commit-session',
    '--title',
    'Commit Note',
    '--content-file',
    contentFile,
    '--attachment',
    attachmentFixture,
  ]).status, 0);

  const result = runMemo(root, ['commit', '--session', 'commit-session', '--message', 'Add commit note']);

  assert.equal(result.status, 0, result.stderr);
  const log = git(vault, ['log', '--oneline', '-1']);
  assert.equal(log.status, 0, log.stderr);
  assert.match(log.stdout, /Add commit note/);
  const manifest = readFileSync(path.join(root, 'memo-home', 'state', 'sessions', 'commit-session.manifest'), 'utf8');
  assert.match(manifest, /ARCHIVED='true'/);
});

test('commit does not include unrelated pre-staged vault changes', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(git(vault, ['init']).status, 0);
  assert.equal(git(vault, ['checkout', '-b', 'main']).status, 0);
  writeFileSync(path.join(vault, 'unrelated.md'), 'unrelated\n');
  assert.equal(git(vault, ['add', 'unrelated.md']).status, 0);
  assert.equal(runMemo(root, [
    'init',
    '--language',
    'en',
    '--mode',
    'local',
    '--vault',
    vault,
    '--local-git-commit',
    'enabled',
  ]).status, 0);
  const contentFile = path.join(root, 'exact.md');
  writeFileSync(contentFile, 'exact body\n');
  assert.equal(runMemo(root, ['write', '--session', 'exact-session', '--title', 'Exact Note', '--content-file', contentFile]).status, 0);

  const result = runMemo(root, ['commit', '--session', 'exact-session', '--message', 'Add exact note']);

  assert.equal(result.status, 0, result.stderr);
  const committedFiles = git(vault, ['show', '--name-only', '--format=', 'HEAD']);
  assert.equal(committedFiles.status, 0, committedFiles.stderr);
  assert.match(committedFiles.stdout, /Notes\/\d{4}-\d{2}-\d{2}-exact-note\.md/);
  assert.doesNotMatch(committedFiles.stdout, /unrelated\.md/);
  const staged = git(vault, ['diff', '--cached', '--name-only']);
  assert.match(staged.stdout, /unrelated\.md/);
});

test('local commit disabled refuses commit and local mode refuses push', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);
  const contentFile = path.join(root, 'no-commit.md');
  writeFileSync(contentFile, 'no commit body\n');
  assert.equal(runMemo(root, ['write', '--session', 'no-commit-session', '--title', 'No Commit', '--content-file', contentFile]).status, 0);

  const commit = runMemo(root, ['commit', '--session', 'no-commit-session', '--message', 'No commit']);
  assert.notEqual(commit.status, 0);
  assert.match(commit.stderr, /Local commit is disabled/);

  const push = runMemo(root, ['push']);
  assert.notEqual(push.status, 0);
  assert.match(push.stderr, /remote mode/);
});

test('abandon removes only manifest-listed draft and attachments', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);
  const contentFile = path.join(root, 'abandon.md');
  writeFileSync(contentFile, 'abandon body\n');
  assert.equal(runMemo(root, [
    'write',
    '--session',
    'abandon-session',
    '--title',
    'Abandon Note',
    '--content-file',
    contentFile,
    '--attachment',
    attachmentFixture,
  ]).status, 0);
  const note = path.join(vault, 'Notes', `${new Date().toISOString().slice(0, 10)}-abandon-note.md`);
  assert.equal(existsSync(note), true);

  const result = runMemo(root, ['write', '--abandon', '--session', 'abandon-session']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(note), false);
  const manifest = readFileSync(path.join(root, 'memo-home', 'state', 'sessions', 'abandon-session.manifest'), 'utf8');
  assert.match(manifest, /ABANDONED='true'/);
});

test('write rejects notes directory symlink that escapes the vault', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  const outside = path.join(root, 'outside-notes');
  mkdirSync(outside, { recursive: true });
  symlinkSync(outside, path.join(vault, 'Notes'));

  const result = runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /escapes vault/);
  assert.equal(existsSync(path.join(outside, `${new Date().toISOString().slice(0, 10)}-symlink.md`)), false);
});

test('repeated session abandon cleans attachments from earlier revisions', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);
  const first = path.join(root, 'first-attach.md');
  const second = path.join(root, 'second-attach.md');
  const secondAttachment = path.join(root, 'second.png');
  writeFileSync(first, 'first attachment body\n');
  writeFileSync(second, 'second attachment body\n');
  writeFileSync(secondAttachment, 'second image\n');
  assert.equal(runMemo(root, ['write', '--session', 'replace-session', '--title', 'Replace Note', '--content-file', first, '--attachment', attachmentFixture]).status, 0);
  const firstAttachmentPath = path.join(vault, 'assets', new Date().getFullYear().toString(), String(new Date().getMonth() + 1).padStart(2, '0'), 'replace-note', 'image-1.png');
  assert.equal(existsSync(firstAttachmentPath), true);
  assert.equal(runMemo(root, ['write', '--session', 'replace-session', '--title', 'Replace Changed', '--content-file', second, '--attachment', secondAttachment]).status, 0);
  const secondAttachmentPath = path.join(vault, 'assets', new Date().getFullYear().toString(), String(new Date().getMonth() + 1).padStart(2, '0'), 'replace-changed', 'image-1.png');
  assert.equal(existsSync(secondAttachmentPath), true);

  const result = runMemo(root, ['write', '--abandon', '--session', 'replace-session']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(firstAttachmentPath), false);
  assert.equal(existsSync(secondAttachmentPath), false);
});

test('status reports attachment paths', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault]).status, 0);
  const contentFile = path.join(root, 'status-attachment.md');
  writeFileSync(contentFile, 'status attachment body\n');
  assert.equal(runMemo(root, ['write', '--session', 'status-attachment-session', '--title', 'Status Attachment', '--content-file', contentFile, '--attachment', attachmentFixture]).status, 0);

  const result = runMemo(root, ['status', '--session', 'status-attachment-session']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Attachment 1:/);
  assert.match(result.stdout, /image-1\.png/);
});

test('info uses persisted Chinese language preference', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'zh-CN', '--mode', 'local', '--vault', vault]).status, 0);

  const result = runMemo(root, ['info']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /语言:/);
  assert.match(result.stdout, /模式: local/);
});

test('init can persist auto notes directory and skip install targets', () => {
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
    'auto',
    '--install-target',
    'skip',
  ]);

  assert.equal(init.status, 0, init.stderr);
  const config = readFileSync(path.join(root, 'memo-home', 'config'), 'utf8');
  assert.match(config, /MEMO_NOTES_DIR='auto'/);
  assert.match(config, /MEMO_CONFIRMED_INSTALL_TARGETS=''/);
});

test('auto notes mode requires write --path', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault, '--notes-dir', 'auto']).status, 0);
  const contentFile = path.join(root, 'auto.md');
  writeFileSync(contentFile, 'auto body\n');

  const result = runMemo(root, ['write', '--session', 'auto-missing', '--title', 'Auto Missing', '--content-file', contentFile]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--path/);
});

test('auto notes mode writes to caller-provided vault-relative path', () => {
  const root = makeTempRoot();
  const vault = makeVault(root);
  assert.equal(runMemo(root, ['init', '--language', 'en', '--mode', 'local', '--vault', vault, '--notes-dir', 'auto']).status, 0);
  const contentFile = path.join(root, 'auto-path.md');
  writeFileSync(contentFile, 'auto path body\n');

  const result = runMemo(root, [
    'write',
    '--session',
    'auto-path',
    '--title',
    'Ignored Title',
    '--path',
    '项目调研/开源营销系统选型分析.md',
    '--content-file',
    contentFile,
  ]);

  assert.equal(result.status, 0, result.stderr);
  const note = path.join(vault, '项目调研', '开源营销系统选型分析.md');
  assert.equal(existsSync(note), true);
  assert.equal(readFileSync(note, 'utf8'), 'auto path body\n');
});
