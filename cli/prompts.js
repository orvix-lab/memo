export async function chooseLanguage(message = 'Language') {
  const { select } = await import('@inquirer/prompts');
  return select({
    message,
    choices: [
      { name: 'English', value: 'en' },
      { name: '简体中文', value: 'zh-CN' },
    ],
  });
}

export function initBanner() {
  return [
    '███╗   ███╗███████╗███╗   ███╗ ██████╗',
    '████╗ ████║██╔════╝████╗ ████║██╔═══██╗',
    '██╔████╔██║█████╗  ██╔████╔██║██║   ██║',
    '██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██║   ██║',
    '██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║╚██████╔╝',
    '╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝',
    'MEMO',
  ].join('\n');
}

export function modeChoices(language = 'en') {
  if (language === 'zh-CN') {
    return [
      { name: 'local（只写入本地 Obsidian vault，不执行 pull/push）', value: 'local' },
      { name: 'remote（写入前 pull --ff-only，确认后 commit/push）', value: 'remote' },
    ];
  }
  return [
    { name: 'local (write local Obsidian vault only, no pull/push)', value: 'local' },
    { name: 'remote (pull --ff-only before write, commit/push after confirmation)', value: 'remote' },
  ];
}

export function notesDirectoryChoices(language = 'en') {
  if (language === 'zh-CN') {
    return [
      { name: 'Auto（推荐：由 AI 根据笔记内容判断放到哪个文件夹）', value: 'auto' },
      { name: 'Custom folder（固定写入用户指定 vault 相对目录）', value: 'custom' },
    ];
  }
  return [
    { name: 'Auto (recommended: AI chooses the folder based on note content)', value: 'auto' },
    { name: 'Custom folder (always write to a fixed vault-relative directory)', value: 'custom' },
  ];
}

export function installTargetChoices(language = 'en') {
  if (language === 'zh-CN') {
    return [
      { name: 'Codex', value: 'codex' },
      { name: 'Claude Code', value: 'claude' },
      { name: '暂时跳过', value: 'skip' },
    ];
  }
  return [
    { name: 'Codex', value: 'codex' },
    { name: 'Claude Code', value: 'claude' },
    { name: 'Skip for now', value: 'skip' },
  ];
}

export async function chooseMode(message = 'Mode', language = 'en') {
  const { select } = await import('@inquirer/prompts');
  return select({
    message,
    choices: modeChoices(language),
  });
}

export async function chooseNotesDirectory(message = 'Notes directory', language = 'en') {
  const { select } = await import('@inquirer/prompts');
  return select({
    message,
    choices: notesDirectoryChoices(language),
  });
}

export async function chooseInstallTarget(message = 'Install memo into', language = 'en') {
  const { select } = await import('@inquirer/prompts');
  return select({
    message,
    choices: installTargetChoices(language),
  });
}

export async function chooseTargets(message = 'Install targets') {
  const { checkbox } = await import('@inquirer/prompts');
  return checkbox({
    message,
    choices: [
      { name: 'Codex', value: 'codex' },
      { name: 'Claude Code', value: 'claude' },
    ],
  });
}

export async function confirm(message, defaultValue = false) {
  const prompts = await import('@inquirer/prompts');
  return prompts.confirm({ message, default: defaultValue });
}

export async function inputText(message, defaultValue = '') {
  const { input } = await import('@inquirer/prompts');
  return input({ message, default: defaultValue });
}
