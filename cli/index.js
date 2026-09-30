import { commandDescriptions, t } from './i18n.js';
import { chooseInstallTarget, chooseLanguage, chooseMode, chooseNotesDirectory, confirm, initBanner, inputText } from './prompts.js';
import { chooseTargets } from './prompts.js';
import { runScript } from './run-script.js';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const commands = [
  'init',
  'config',
  'doctor',
  'install',
  'write',
  'status',
  'sync',
  'spec',
  'info',
  'commit',
  'push',
  'help',
];

function printHelp(language = 'en') {
  const descriptions = commandDescriptions(language);
  const longest = Math.max(...commands.map((command) => command.length));
  console.log('memo');
  console.log(t(language, 'appDescription'));
  console.log('');
  console.log(t(language, 'usage'));
  console.log('');
  console.log(t(language, 'commands'));
  for (const command of commands) {
    console.log(`  ${command.padEnd(longest)}  ${descriptions[command]}`);
  }
}

function readConfiguredLanguage() {
  if (process.env.MEMO_LANGUAGE) {
    return process.env.MEMO_LANGUAGE;
  }
  const configPath = path.join(process.env.MEMO_HOME || path.join(os.homedir(), '.config', 'memo'), 'config');
  try {
    const config = readFileSync(configPath, 'utf8');
    const match = config.match(/^MEMO_LANGUAGE='([^']*)'/m) || config.match(/^MEMO_LANGUAGE="?([^"\n]*)"?/m);
    return match?.[1] || 'en';
  } catch {
    return 'en';
  }
}

function forwardScript(scriptName, args) {
  const result = runScript(scriptName, args, { stdio: 'inherit' });
  return result.status ?? 1;
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function runInit(args) {
  if (args.length > 0) {
    return forwardScript('memo-init.sh', args);
  }
  console.log(initBanner());
  const nextArgs = [...args];
  let language = optionValue(nextArgs, '--language');
  if (!optionValue(nextArgs, '--language')) {
    language = await chooseLanguage('Language');
    nextArgs.push('--language', language);
  }
  if (!optionValue(nextArgs, '--mode')) {
    nextArgs.push('--mode', await chooseMode('Mode', language));
  }
  if (!optionValue(nextArgs, '--vault')) {
    nextArgs.push('--vault', await inputText('Obsidian vault path'));
  }
  if (!optionValue(nextArgs, '--notes-dir')) {
    const notesStrategy = await chooseNotesDirectory('Notes directory', language);
    if (notesStrategy === 'auto') {
      nextArgs.push('--notes-dir', 'auto');
    } else {
      nextArgs.push('--notes-dir', await inputText('Custom notes folder', 'Notes'));
    }
  }
  if (!optionValue(nextArgs, '--assets-dir')) {
    nextArgs.push('--assets-dir', await inputText('Assets directory', 'assets'));
  }
  if (optionValue(nextArgs, '--mode') === 'local' && !optionValue(nextArgs, '--local-git-commit')) {
    const vault = optionValue(nextArgs, '--vault');
    const gitCheck = spawnSync('git', ['-C', vault, 'rev-parse', '--is-inside-work-tree'], {
      encoding: 'utf8',
      stdio: 'ignore',
    });
    if (gitCheck.status === 0) {
      const enabled = await confirm('Enable local commit after confirmation?', false);
      nextArgs.push('--local-git-commit', enabled ? 'enabled' : 'disabled');
    } else {
      nextArgs.push('--local-git-commit', 'disabled');
    }
  }
  if (!optionValue(nextArgs, '--install-target')) {
    nextArgs.push('--install-target', await chooseInstallTarget('Install memo into', language));
  }
  return forwardScript('memo-init.sh', nextArgs);
}

async function runInstall(args) {
  if (args.length > 0) {
    return forwardScript('memo-install.sh', args);
  }
  const targets = await chooseTargets('Install memo into');
  let status = 0;
  for (const target of targets) {
    const result = forwardScript('memo-install.sh', ['--target', target]);
    if (result !== 0) {
      status = result;
    }
  }
  return status;
}

async function runConfig(args) {
  if (args.length > 0) {
    return forwardScript('memo-configure.sh', args);
  }
  const nextArgs = [];
  const language = await chooseLanguage('Language');
  nextArgs.push('--language', language);
  const mode = await chooseMode('Mode', language);
  nextArgs.push('--mode', mode);
  const vault = await inputText('Obsidian vault path');
  if (vault) {
    nextArgs.push('--vault', vault);
  }
  const notesDir = await inputText('Notes directory', 'Notes');
  if (notesDir) {
    nextArgs.push('--notes-dir', notesDir);
  }
  const assetsDir = await inputText('Assets directory', 'assets');
  if (assetsDir) {
    nextArgs.push('--assets-dir', assetsDir);
  }
  if (mode === 'local') {
    const enabled = await confirm('Enable local commit after confirmation?', false);
    nextArgs.push('--local-git-commit', enabled ? 'enabled' : 'disabled');
  }
  return forwardScript('memo-configure.sh', nextArgs);
}

async function runPlaceholder(command, language) {
  console.error(t(language, 'notImplemented', { command }));
  return 2;
}

export async function main(argv = []) {
  const language = readConfiguredLanguage();
  const [command = 'help'] = argv;

  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp(language);
    return 0;
  }

  if (!commands.includes(command)) {
    console.error(t(language, 'unknownCommand', { command }));
    return 1;
  }

  if (command === 'init') {
    return runInit(argv.slice(1));
  }
  if (command === 'doctor') {
    return forwardScript('memo-doctor.sh', argv.slice(1));
  }
  if (command === 'info') {
    return forwardScript('memo-info.sh', argv.slice(1));
  }
  if (command === 'config') {
    return runConfig(argv.slice(1));
  }
  if (command === 'install') {
    return runInstall(argv.slice(1));
  }
  if (command === 'write') {
    return forwardScript('memo-write.sh', argv.slice(1));
  }
  if (command === 'status') {
    return forwardScript('memo-status.sh', argv.slice(1));
  }
  if (command === 'sync') {
    return forwardScript('memo-sync.sh', argv.slice(1));
  }
  if (command === 'spec') {
    return forwardScript('memo-spec.sh', argv.slice(1));
  }
  if (command === 'commit') {
    return forwardScript('memo-commit.sh', argv.slice(1));
  }
  if (command === 'push') {
    return forwardScript('memo-push.sh', argv.slice(1));
  }

  const status = await runPlaceholder(command, language);
  process.exitCode = status;
  return status;
}
