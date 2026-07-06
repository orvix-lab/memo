import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function scriptPath(scriptName) {
  return path.join(repoRoot, 'scripts', scriptName);
}

export function runScript(scriptName, args = [], options = {}) {
  const result = spawnSync('sh', [scriptPath(scriptName), ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
    env: {
      ...process.env,
      ...options.env,
    },
  });
  return result;
}
