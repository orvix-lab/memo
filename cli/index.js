import { commandDescriptions, t } from './i18n.js';

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

async function runPlaceholder(command, language) {
  console.error(t(language, 'notImplemented', { command }));
  return 2;
}

export async function main(argv = []) {
  const language = process.env.MEMO_LANGUAGE || 'en';
  const [command = 'help'] = argv;

  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp(language);
    return 0;
  }

  if (!commands.includes(command)) {
    console.error(t(language, 'unknownCommand', { command }));
    return 1;
  }

  const status = await runPlaceholder(command, language);
  process.exitCode = status;
  return status;
}
