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

export async function chooseMode(message = 'Mode') {
  const { select } = await import('@inquirer/prompts');
  return select({
    message,
    choices: [
      { name: 'local', value: 'local' },
      { name: 'remote', value: 'remote' },
    ],
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
