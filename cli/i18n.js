const catalogs = {
  en: {
    appDescription: 'Archive AI-generated notes and attachments into an Obsidian vault.',
    usage: 'Usage: memo <command> [options]',
    commands: 'Commands:',
    unknownCommand: 'Unknown command: {command}',
    notImplemented: 'Command not implemented yet: {command}',
    commandDescriptions: {
      init: 'Configure language, mode, vault, notes, and assets directories.',
      config: 'Update memo configuration.',
      doctor: 'Check whether memo is ready to run.',
      install: 'Install the memo skill into supported AI tools.',
      write: 'Write or update a draft note and attachments.',
      status: 'Show the current draft, attachments, and mode status.',
      sync: 'Fetch and fast-forward pull the remote-mode vault.',
      spec: 'Synchronize an OpenSpec change into the configured vault.',
      info: 'Show memo configuration and installation status.',
      commit: 'Commit confirmed note and attachment changes.',
      push: 'Push confirmed remote-mode changes.',
      help: 'Show this help message.',
    },
  },
  'zh-CN': {
    appDescription: '将 AI 生成的笔记和附件归档到 Obsidian vault。',
    usage: '用法：memo <command> [options]',
    commands: '命令：',
    unknownCommand: '未知命令：{command}',
    notImplemented: '命令尚未实现：{command}',
    commandDescriptions: {
      init: '配置语言、模式、vault、笔记目录和附件目录。',
      config: '更新 memo 配置。',
      doctor: '检查 memo 是否可运行。',
      install: '安装 memo skill 到支持的 AI 工具。',
      write: '写入或更新草稿笔记和附件。',
      status: '显示当前草稿、附件和模式状态。',
      sync: '拉取并快进同步远端模式 vault。',
      spec: '将 OpenSpec change 同步到已配置 vault。',
      info: '显示 memo 配置和安装状态。',
      commit: '提交已确认的笔记和附件变更。',
      push: '推送已确认的远端模式变更。',
      help: '显示帮助信息。',
    },
  },
};

export const supportedLanguages = Object.freeze(Object.keys(catalogs));

export function normalizeLanguage(language) {
  return supportedLanguages.includes(language) ? language : 'en';
}

export function t(language, key, vars = {}) {
  const normalized = normalizeLanguage(language);
  const value = key.split('.').reduce((current, part) => current?.[part], catalogs[normalized]);
  if (typeof value !== 'string') {
    return key;
  }
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => String(vars[name] ?? ''));
}

export function commandDescriptions(language) {
  const normalized = normalizeLanguage(language);
  return catalogs[normalized].commandDescriptions;
}
